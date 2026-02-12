import { atom } from 'jotai'

// ─── Atoms (in-memory only) ──────────────────────────────

/** Whether the Molt gateway WebSocket is connected */
export const gatewayConnectedAtom = atom<boolean>(false)

/** Whether a Molt gateway connection attempt is in progress */
export const gatewayConnectingAtom = atom<boolean>(false)

/** Last gateway error message, if any */
export const gatewayErrorAtom = atom<string | null>(null)
