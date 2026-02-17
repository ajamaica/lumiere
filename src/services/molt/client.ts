/**
 * MoltGatewayClient — full protocol v3 WebSocket client.
 *
 * Handles connect handshake, request/response with timeouts,
 * event subscriptions, auto-reconnect with exponential backoff + jitter,
 * keepalive tick monitoring, and typed RPC methods.
 */

import {
  clientConfig,
  GatewayEvents,
  GatewayMethods,
  protocolConfig,
} from '../../config/gateway.config'
import { logger } from '../../utils/logger'
import {
  AgentEvent,
  AgentEventCallback,
  AgentParams,
  ChatAttachmentPayload,
  ChatSendResponse,
  ConnectionState,
  ConnectionStateCallback,
  ConnectResponse,
  EventCallback,
  EventFrame,
  GatewayError,
  GatewayErrorShape,
  GatewayFrame,
  GatewayLogsParams,
  GatewayLogsResponse,
  HealthStatus,
  MoltConfig,
  PendingRequest,
  RequestFrame,
  ResponseFrame,
  SendMessageParams,
  SessionsSpawnParams,
  SessionsSpawnResponse,
  Skill,
  SkillsListResponse,
  SubagentEvent,
  SubagentsListResponse,
  TeachSkillParams,
  UpdateSkillParams,
} from './types'
import { toWebSocketUrl } from './url'

const wsLogger = logger.create('WebSocket')

// ─── Client ─────────────────────────────────────────────────────────────────────

export class MoltGatewayClient {
  private ws: WebSocket | null = null
  private config: MoltConfig

  // Connection state machine
  private _connectionState: ConnectionState = 'disconnected'

  // Request / response tracking with timeouts
  private requestIdCounter = 0
  private pendingRequests = new Map<string, PendingRequest>()

  // Event subscriptions (Set-based for O(1) add/remove)
  private eventListeners = new Map<string, Set<EventCallback>>()
  private connectionStateListeners = new Set<ConnectionStateCallback>()
  private agentEventListeners = new Set<AgentEventCallback>()
  private subagentEventListeners = new Set<(event: SubagentEvent) => void>()

  // Reconnection
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalClose = false

  // Keepalive tick monitoring
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private tickIntervalMs = 15_000
  private lastTickReceived = 0
  private missedTickThreshold = 3

  // Sequence gap detection
  private lastSeq = -1

  // Handshake state
  private connectPromiseResolve: ((value: ConnectResponse) => void) | null = null
  private connectPromiseReject: ((reason: Error) => void) | null = null
  private connectResponse: ConnectResponse | null = null
  private handshakeTimerId: ReturnType<typeof setTimeout> | null = null

  // Device identity provider for challenge-response handshake
  private deviceIdentityProvider:
    | (() => Promise<{
        id: string
        publicKey: string
        sign: (payload: string) => Promise<string>
      }>)
    | null = null

  constructor(config: MoltConfig) {
    this.config = {
      clientId: 'lumiere-mobile',
      autoReconnect: true,
      defaultTimeoutMs: 15_000,
      ...config,
    }
  }

  // ─── Public Getters ─────────────────────────────────────────────────────────

  get connectionState(): ConnectionState {
    return this._connectionState
  }

  get isConnected(): boolean {
    return this._connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  get serverInfo(): ConnectResponse | null {
    return this.connectResponse
  }

  /**
   * Set a device identity provider for challenge-response handshake.
   * The provider returns the device id, publicKey, and a sign function
   * that will be called with the full auth payload string.
   */
  setDeviceIdentityProvider(
    provider: () => Promise<{
      id: string
      publicKey: string
      sign: (payload: string) => Promise<string>
    }>,
  ): void {
    this.deviceIdentityProvider = provider
  }

  // ─── Connection Lifecycle ───────────────────────────────────────────────────

  connect(): Promise<ConnectResponse> {
    if (this._connectionState === 'connected' || this._connectionState === 'connecting') {
      return Promise.reject(new Error(`Already ${this._connectionState}`))
    }

    this.intentionalClose = false
    this.setConnectionState('connecting')

    return new Promise<ConnectResponse>((resolve, reject) => {
      this.connectPromiseResolve = resolve
      this.connectPromiseReject = reject
      this.openWebSocket()
    })
  }

  disconnect(): void {
    this.intentionalClose = true
    this.clearReconnectTimer()
    this.clearTickTimer()

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Client disconnected'))
      this.pendingRequests.delete(id)
    }

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect')
      } catch {
        // ignore close errors
      }
      this.ws = null
    }

    this.setConnectionState('disconnected')
  }

  /**
   * Manually retry after automatic reconnection was exhausted or after
   * an intentional disconnect. Resets internal counters and connects fresh.
   */
  retryConnection(): Promise<ConnectResponse> {
    this.clearReconnectTimer()
    this.reconnectAttempt = 0
    this.intentionalClose = false
    return this.connect()
  }

  // ─── Request / Response ─────────────────────────────────────────────────────

  /**
   * Send a typed request and wait for the matching response.
   * Each request has a timeout to prevent indefinite hangs.
   */
  request<T = unknown>(method: string, params?: unknown, timeoutMs?: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this._connectionState !== 'connected') {
        return reject(new Error('Not connected'))
      }

      const id = this.nextRequestId()
      const timeout = timeoutMs ?? this.config.defaultTimeoutMs ?? 15_000

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request ${method} timed out after ${timeout}ms`))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (payload: unknown) => void,
        reject,
        timer,
      })

      const frame: RequestFrame = {
        type: 'req',
        id,
        method,
        params,
      }

      this.sendFrame(frame)
    })
  }

  // ─── Event Subscription ────────────────────────────────────────────────────

  /** Subscribe to a named event. */
  on(eventName: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set())
    }
    this.eventListeners.get(eventName)!.add(callback)
    return () => this.eventListeners.get(eventName)?.delete(callback)
  }

  /** Unsubscribe from a named event. */
  off(eventName: string, callback: EventCallback): void {
    this.eventListeners.get(eventName)?.delete(callback)
  }

  /** Subscribe to connection state changes. Returns unsubscribe function. */
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.connectionStateListeners.add(callback)
    return () => this.connectionStateListeners.delete(callback)
  }

  /** Subscribe to agent run progress events. Returns unsubscribe function. */
  onAgentEvent(callback: AgentEventCallback): () => void {
    this.agentEventListeners.add(callback)
    return () => this.agentEventListeners.delete(callback)
  }

  /** Subscribe to sub-agent lifecycle events. Returns unsubscribe function. */
  onSubagentEvent(callback: (event: SubagentEvent) => void): () => void {
    this.subagentEventListeners.add(callback)
    return () => this.subagentEventListeners.delete(callback)
  }

  /**
   * Legacy API — subscribe to all raw event frames.
   * Prefer `on(eventName, cb)` or `onAgentEvent(cb)` for new code.
   */
  addEventListener(listener: (event: EventFrame) => void): () => void {
    const wrappedByEvent = new Map<string, EventCallback>()

    // We register a meta-listener that forwards every event type.
    const handler = (frame: EventFrame) => listener(frame)

    // Store unsubscribers so we can clean up.
    const internalUnsub = this.on('__legacy__', handler as EventCallback)

    // The actual routing happens in handleEvent — we store the raw listener
    // separately so we can call it from there.
    this._legacyListeners.add(listener)

    return () => {
      internalUnsub()
      wrappedByEvent.forEach((cb, evt) => this.off(evt, cb))
      this._legacyListeners.delete(listener)
    }
  }

  private _legacyListeners = new Set<(event: EventFrame) => void>()

  // ─── RPC Methods ───────────────────────────────────────────────────────────

  async getHealth(timeoutMs = 5_000): Promise<HealthStatus> {
    return this.request<HealthStatus>(GatewayMethods.HEALTH, undefined, timeoutMs)
  }

  async getStatus(): Promise<unknown> {
    return this.request(GatewayMethods.STATUS)
  }

  async sendMessage(params: SendMessageParams): Promise<unknown> {
    return this.request(GatewayMethods.CHAT_SEND, params)
  }

  /**
   * Send a chat message with optional thinking and file attachments.
   * Uses the `chat.send` RPC method aligned with the gateway protocol.
   *
   * The server-side timeout is forwarded so the gateway knows how long to
   * allow for the agent run. The client-side timeout adds a 5-second buffer
   * beyond the server timeout to account for network latency.
   */
  async chatSend(
    sessionKey: string,
    message: string,
    options?: {
      thinking?: string
      attachments?: ChatAttachmentPayload[]
      idempotencyKey?: string
      timeoutMs?: number
    },
  ): Promise<ChatSendResponse> {
    const idempotencyKey = options?.idempotencyKey ?? generateIdempotencyKey()
    const serverTimeout = options?.timeoutMs ?? 30_000

    return this.request<ChatSendResponse>(
      GatewayMethods.CHAT_SEND,
      {
        sessionKey,
        message,
        thinking: options?.thinking ?? '',
        attachments: options?.attachments?.length ? options.attachments : undefined,
        timeoutMs: serverTimeout,
        idempotencyKey,
      },
      // Extra buffer beyond the server-side timeout for network latency
      serverTimeout + 5_000,
    )
  }

  /**
   * Abort a running chat agent by session and run ID.
   */
  async chatAbort(sessionKey: string, runId: string): Promise<void> {
    await this.request(GatewayMethods.CHAT_ABORT, { sessionKey, runId }, 10_000)
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<unknown> {
    return this.request(GatewayMethods.CHAT_HISTORY, { sessionKey, limit })
  }

  async resetSession(sessionKey: string): Promise<unknown> {
    return this.request(GatewayMethods.SESSIONS_RESET, { key: sessionKey })
  }

  async deleteSession(sessionKey: string): Promise<unknown> {
    return this.request(GatewayMethods.SESSIONS_DELETE, { key: sessionKey })
  }

  async listSessions(): Promise<unknown> {
    return this.request(GatewayMethods.SESSIONS_LIST)
  }

  async getSchedulerStatus(): Promise<unknown> {
    return this.request(GatewayMethods.CRON_STATUS)
  }

  async listCronJobs(): Promise<unknown> {
    return this.request(GatewayMethods.CRON_LIST)
  }

  async disableCronJob(jobId: string): Promise<unknown> {
    return this.request(GatewayMethods.CRON_UPDATE, { jobId, patch: { enabled: false } })
  }

  async enableCronJob(jobId: string): Promise<unknown> {
    return this.request(GatewayMethods.CRON_UPDATE, { jobId, patch: { enabled: true } })
  }

  async runCronJob(jobId: string, mode: 'force' | 'due' = 'force'): Promise<unknown> {
    return this.request(GatewayMethods.CRON_RUN, { jobId, mode })
  }

  async removeCronJob(jobId: string): Promise<unknown> {
    return this.request(GatewayMethods.CRON_REMOVE, { jobId })
  }

  async getCronJobRuns(jobId: string): Promise<unknown> {
    return this.request(GatewayMethods.CRON_RUNS, { jobId })
  }

  async teachSkill(params: TeachSkillParams): Promise<Skill> {
    return this.request<Skill>(GatewayMethods.SKILLS_TEACH, params)
  }

  async listSkills(): Promise<SkillsListResponse> {
    return this.request<SkillsListResponse>(GatewayMethods.SKILLS_LIST)
  }

  async removeSkill(name: string): Promise<unknown> {
    return this.request(GatewayMethods.SKILLS_REMOVE, { name })
  }

  async updateSkill(params: UpdateSkillParams): Promise<Skill> {
    return this.request<Skill>(GatewayMethods.SKILLS_UPDATE, params)
  }

  async getLogs(params?: GatewayLogsParams): Promise<GatewayLogsResponse> {
    return this.request<GatewayLogsResponse>(GatewayMethods.LOGS_TAIL, params)
  }

  /**
   * Spawn a sub-agent run. Non-blocking — returns immediately with the run ID
   * and child session key. The sub-agent announces its result back via a
   * `subagent` event when finished.
   */
  async spawnSubagent(params: SessionsSpawnParams): Promise<SessionsSpawnResponse> {
    return this.request<SessionsSpawnResponse>(GatewayMethods.SESSIONS_SPAWN, params)
  }

  /** List active sub-agent runs, optionally filtered by session key. */
  async listSubagents(sessionKey?: string): Promise<SubagentsListResponse> {
    return this.request<SubagentsListResponse>(
      GatewayMethods.SUBAGENTS_LIST,
      sessionKey ? { sessionKey } : undefined,
    )
  }

  /** Stop a running sub-agent by its run ID. */
  async stopSubagent(runId: string): Promise<void> {
    await this.request(GatewayMethods.SUBAGENTS_STOP, { runId }, 10_000)
  }

  async sendAgentRequest(
    params: AgentParams,
    onEvent?: (event: AgentEvent) => void,
  ): Promise<unknown> {
    let unsubscribe: (() => void) | null = null

    if (onEvent) {
      unsubscribe = this.onAgentEvent((agentEvent) => {
        try {
          onEvent(agentEvent)
        } catch {
          // Isolate listener errors
        }

        if (agentEvent.stream === 'lifecycle' && agentEvent.data.phase === 'end') {
          unsubscribe?.()
        }
      })
    }

    try {
      return await this.request(GatewayMethods.AGENT, params)
    } catch (err) {
      unsubscribe?.()
      throw err
    }
  }

  // ─── Private: WebSocket Lifecycle ──────────────────────────────────────────

  private openWebSocket(): void {
    const url = toWebSocketUrl(this.config.url)

    try {
      this.ws = new WebSocket(url)
    } catch (err) {
      this.handleConnectFailure(err instanceof Error ? err : new Error(String(err)))
      return
    }

    this.ws.onopen = () => {
      wsLogger.info('WebSocket connected')
      this.performHandshake()
        .then((response) => {
          this.handleHelloOk(response)
        })
        .catch((err) => {
          this.handleConnectFailure(err instanceof Error ? err : new Error(String(err)))
        })
    }

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data)
    }

    this.ws.onerror = (error) => {
      wsLogger.logError('WebSocket error', error)
      // onerror is always followed by onclose — handle reconnection there
    }

    this.ws.onclose = (event) => {
      this.handleClose(event.code, event.reason)
    }
  }

  /**
   * Two-phase handshake:
   * 1. Try connecting without device identity (works for servers that don't require it).
   * 2. If the server rejects with a device-related error, wait for the challenge
   *    event, sign it, and retry with full device identity.
   *
   * A challenge listener is kept alive across both phases so the event isn't missed.
   */
  private async performHandshake(): Promise<ConnectResponse> {
    // Eagerly listen for a connect.challenge event — the server sends it
    // right after WebSocket open if device auth is required.
    let receivedChallenge: { nonce: string; timestamp?: number } | null = null
    let challengeResolve: ((c: { nonce: string; timestamp?: number }) => void) | null = null
    const challengePromise = new Promise<{ nonce: string; timestamp?: number }>((resolve) => {
      challengeResolve = resolve
    })
    const challengeUnsub = this.on(GatewayEvents.CONNECT_CHALLENGE, (payload) => {
      receivedChallenge = payload as { nonce: string; timestamp?: number }
      challengeResolve?.(receivedChallenge)
    })

    const auth: { token?: string; password?: string } = {
      token: this.config.token,
    }
    if (this.config.password) {
      auth.password = this.config.password
    }

    const role = 'operator'
    const scopes = ['operator.admin']

    const baseParams: Record<string, unknown> = {
      minProtocol: protocolConfig.minProtocol,
      maxProtocol: protocolConfig.maxProtocol,
      client: clientConfig,
      auth,
      role,
      scopes,
    }

    // Phase 1: Connect without device identity
    try {
      const response = await this.sendConnectRequest(baseParams)

      // If the server accepted but also sent a challenge, the connection has
      // limited permissions (e.g. operator.read). Re-connect with full device
      // identity to upgrade to operator.admin.
      if (!receivedChallenge || !this.deviceIdentityProvider) {
        challengeUnsub()
        return response
      }

      wsLogger.info('Challenge received — upgrading connection with device identity')
    } catch (err) {
      // If no device identity provider configured, we can't retry with device auth
      if (!this.deviceIdentityProvider) {
        challengeUnsub()
        throw err
      }

      // Only retry for device-related errors
      const needsDeviceAuth =
        err instanceof GatewayError &&
        (err.code === 'DEVICE_IDENTITY_REQUIRED' ||
          err.message.toLowerCase().includes('device identity'))
      if (!needsDeviceAuth) {
        challengeUnsub()
        throw err
      }
    }

    // Phase 2: Server requires device identity — get the challenge
    // The challenge event usually arrives before the error response (TCP ordering),
    // but we handle both cases: already received or still pending.
    const challenge =
      receivedChallenge ||
      (await Promise.race([
        challengePromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timed out waiting for connect.challenge')), 10_000),
        ),
      ]))
    challengeUnsub()

    // Sign the challenge with Ed25519 device keypair
    const identity = await this.deviceIdentityProvider!()
    const signedAt = Date.now()

    // Build the pipe-delimited payload that the server reconstructs for verification:
    // v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce
    const authPayload = [
      'v2',
      identity.id,
      clientConfig.id,
      clientConfig.mode,
      role,
      scopes.join(','),
      signedAt.toString(),
      this.config.token,
      challenge.nonce,
    ].join('|')

    const signature = await identity.sign(authPayload)

    const paramsWithDevice: Record<string, unknown> = {
      ...baseParams,
      device: {
        id: identity.id,
        publicKey: identity.publicKey,
        signature,
        signedAt,
        nonce: challenge.nonce,
      },
    }

    return this.sendConnectRequest(paramsWithDevice)
  }

  /** Send a `connect` request frame and wait for the response. */
  private sendConnectRequest(params: Record<string, unknown>): Promise<ConnectResponse> {
    return new Promise<ConnectResponse>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not open for handshake'))
        return
      }

      const id = this.nextRequestId()

      this.handshakeTimerId = setTimeout(() => {
        // Don't timeout while awaiting admin approval
        if (this._connectionState === 'awaiting_approval') return
        this.pendingRequests.delete(id)
        reject(new Error('Connect handshake timed out'))
      }, 10_000)

      this.pendingRequests.set(id, {
        resolve: (payload) => {
          this.clearHandshakeTimer()
          resolve(payload as ConnectResponse)
        },
        reject: (err) => {
          this.clearHandshakeTimer()
          reject(err)
        },
        timer: this.handshakeTimerId,
      })

      const frame: RequestFrame = {
        type: 'req',
        id,
        method: GatewayMethods.CONNECT,
        params,
      }

      this.sendFrame(frame)
    })
  }

  private clearHandshakeTimer(): void {
    if (this.handshakeTimerId) {
      clearTimeout(this.handshakeTimerId)
      this.handshakeTimerId = null
    }
  }

  private handleHelloOk(response: ConnectResponse): void {
    this.connectResponse = response
    this.reconnectAttempt = 0
    this.lastSeq = -1

    // Configure tick interval from server if provided
    if (response.tickIntervalMs) {
      this.tickIntervalMs = response.tickIntervalMs
    } else if (response.snapshot?.tickInterval) {
      this.tickIntervalMs = response.snapshot.tickInterval
    }

    this.startTickMonitor()
    this.setConnectionState('connected')

    // Resolve the connect() promise
    if (this.connectPromiseResolve) {
      this.connectPromiseResolve(response)
      this.connectPromiseResolve = null
      this.connectPromiseReject = null
    }
  }

  private handleConnectFailure(error: Error): void {
    if (this.connectPromiseReject) {
      this.connectPromiseReject(error)
      this.connectPromiseResolve = null
      this.connectPromiseReject = null
    }
    this.setConnectionState('disconnected')
  }

  // ─── Private: Message Handling ─────────────────────────────────────────────

  private handleMessage(data: string): void {
    let frame: GatewayFrame
    try {
      frame = JSON.parse(data) as GatewayFrame
    } catch {
      wsLogger.error('Failed to parse frame')
      return
    }

    switch (frame.type) {
      case 'res':
        this.handleResponse(frame as ResponseFrame)
        break
      case 'event':
        this.handleEvent(frame as EventFrame)
        break
      default:
        break
    }
  }

  private handleResponse(frame: ResponseFrame): void {
    const pending = this.pendingRequests.get(frame.id)
    if (!pending) return

    this.pendingRequests.delete(frame.id)
    clearTimeout(pending.timer)

    if (frame.ok) {
      pending.resolve(frame.payload)
    } else {
      const errorShape = frame.error as GatewayErrorShape | undefined
      if (errorShape) {
        pending.reject(new GatewayError(errorShape))
      } else {
        pending.reject(new Error('Request failed'))
      }
    }
  }

  private handleEvent(frame: EventFrame): void {
    const { event, payload, seq } = frame

    // Sequence gap detection
    if (seq != null) {
      if (this.lastSeq >= 0 && seq > this.lastSeq + 1) {
        this.emitEvent(GatewayEvents.SEQ_GAP, {
          expected: this.lastSeq + 1,
          received: seq,
        })
        wsLogger.error(`Sequence gap detected: expected ${this.lastSeq + 1}, got ${seq}`)
      }
      this.lastSeq = seq
    }

    switch (event) {
      case GatewayEvents.TICK:
        this.handleTick()
        break

      case GatewayEvents.AGENT:
        this.agentEventListeners.forEach((cb) => {
          try {
            cb(payload as AgentEvent)
          } catch {
            // Isolate listener errors to prevent breaking event dispatch
          }
        })
        break

      case GatewayEvents.SUBAGENT:
        this.subagentEventListeners.forEach((cb) => {
          try {
            cb(payload as SubagentEvent)
          } catch {
            // Isolate listener errors to prevent breaking event dispatch
          }
        })
        break

      case GatewayEvents.SHUTDOWN:
        wsLogger.info('Gateway shutdown event received')
        break

      case GatewayEvents.DEVICE_PAIR_REQUESTED:
        wsLogger.info('Device pairing requested — awaiting admin approval')
        this.setConnectionState('awaiting_approval')
        break

      case GatewayEvents.DEVICE_PAIR_RESOLVED:
        wsLogger.info('Device pairing resolved')
        // The handshake response will follow and transition to 'connected'
        break

      default:
        break
    }

    // Emit to named event listeners
    this.emitEvent(event, payload)

    // Forward to legacy addEventListener subscribers
    this._legacyListeners.forEach((listener) => {
      try {
        listener(frame)
      } catch {
        // Isolate listener errors
      }
    })
  }

  // ─── Private: Close & Reconnection ─────────────────────────────────────────

  private handleClose(code: number, reason: string): void {
    wsLogger.info(`WebSocket closed: ${code} ${reason}`)
    this.ws = null
    this.clearTickTimer()

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error(`WebSocket closed: ${code} ${reason}`))
      this.pendingRequests.delete(id)
    }

    if (this.intentionalClose) {
      this.setConnectionState('disconnected')
      return
    }

    // If still in the initial connect(), reject if autoReconnect is off
    if (this.connectPromiseReject && !this.config.autoReconnect) {
      this.handleConnectFailure(new Error(`WebSocket closed during connect: ${code} ${reason}`))
      return
    }

    // Auto-reconnect
    if (this.config.autoReconnect) {
      this.setConnectionState('reconnecting')
      this.scheduleReconnect()
    } else {
      this.setConnectionState('disconnected')
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()

    const baseDelay = 1_000
    const maxDelay = 30_000
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempt), maxDelay)
    // Add jitter: ±25% to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1)
    const finalDelay = Math.round(delay + jitter)

    this.reconnectAttempt++
    wsLogger.info(`Reconnecting in ${finalDelay}ms (attempt ${this.reconnectAttempt})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.attemptReconnect()
    }, finalDelay)
  }

  private attemptReconnect(): void {
    if (this.intentionalClose) return

    this.setConnectionState('connecting')

    // Keep original promise callbacks if reconnecting from a failed initial connect.
    // Otherwise set no-op handlers for transparent reconnection.
    if (!this.connectPromiseResolve) {
      this.connectPromiseResolve = () => {
        // Session reconnected — state already updated in handleHelloOk
      }
      this.connectPromiseReject = () => {
        // Reconnect failure — schedule another attempt
        if (!this.intentionalClose && this.config.autoReconnect) {
          this.setConnectionState('reconnecting')
          this.scheduleReconnect()
        }
      }
    }

    this.openWebSocket()
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // ─── Private: Keepalive / Tick ─────────────────────────────────────────────

  private handleTick(): void {
    this.lastTickReceived = Date.now()
  }

  private startTickMonitor(): void {
    this.clearTickTimer()
    this.lastTickReceived = Date.now()

    const checkInterval = this.tickIntervalMs * 1.5
    this.tickTimer = setInterval(() => {
      if (!this.isConnected) return

      const elapsed = Date.now() - this.lastTickReceived
      const threshold = this.tickIntervalMs * this.missedTickThreshold

      if (elapsed > threshold) {
        wsLogger.error(
          `Missed ${this.missedTickThreshold} ticks (${elapsed}ms since last), forcing reconnect`,
        )
        this.ws?.close(4000, 'Tick timeout')
      }
    }, checkInterval)
  }

  private clearTickTimer(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  // ─── Private: Helpers ──────────────────────────────────────────────────────

  private sendFrame(frame: GatewayFrame): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    try {
      this.ws.send(JSON.stringify(frame))
    } catch {
      // Ignore send errors — close handler will clean up
    }
  }

  private nextRequestId(): string {
    return `lum-${++this.requestIdCounter}-${Date.now().toString(36)}`
  }

  private setConnectionState(state: ConnectionState): void {
    if (this._connectionState === state) return
    this._connectionState = state

    this.connectionStateListeners.forEach((cb) => {
      try {
        cb(state)
      } catch {
        // Isolate listener errors to prevent breaking state dispatch
      }
    })
  }

  private emitEvent(eventName: string, payload: unknown): void {
    const listeners = this.eventListeners.get(eventName)
    if (!listeners) return

    listeners.forEach((cb) => {
      try {
        cb(payload)
      } catch {
        // Isolate listener errors to prevent breaking event dispatch
      }
    })
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────────

/** Generate a unique idempotency key for side-effecting requests. */
export function generateIdempotencyKey(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `idem-${ts}-${rand}`
}
