# Provider Agent Template

Complete template for building an agent that sells services through AGIRAILS.

## Full TypeScript Implementation

```typescript
import { ACTPClient, MockTransaction } from '@agirails/sdk';
import { ethers } from 'ethers';

interface ServiceConfig {
  name: string;
  description: string;
  pricePerUnit: bigint;
  unit: 'word' | 'token' | 'request' | 'hour';
  maxConcurrentJobs: number;
}

interface JobContext {
  txId: string;
  metadata: any;
  startedAt: number;
}

export class ProviderAgent {
  private client!: ACTPClient;
  private wallet!: string;
  private config: ServiceConfig;
  private activeJobs: Map<string, JobContext> = new Map();

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  // ============================================================
  // INITIALIZATION (SDK handles connection)
  // ============================================================

  async start() {
    // SDK handles: wallet connection, contract initialization
    this.client = await ACTPClient.create({
      mode: (process.env.AGIRAILS_MODE as 'mock' | 'testnet' | 'mainnet') ?? 'mainnet',
      privateKey: process.env.AGENT_PRIVATE_KEY!,
      requesterAddress: process.env.AGENT_ADDRESS!,
    });

    this.wallet = await this.client.getAddress();
    console.log(`Provider agent started: ${this.wallet}`);
    console.log(`Service: ${this.config.name}`);

    // Start listening for transactions
    this.setupEventListeners();
  }

  // ============================================================
  // EVENT HANDLING (use your own event monitor or polling)
  // ============================================================

  private setupEventListeners() {
    // Use your own event monitor (ethers) or polling to detect:
    // - TransactionCreated (new jobs)
    // - EscrowLinked (funds locked)
    // - StateTransitioned (progress updates)
  }

  // ============================================================
  // REQUEST HANDLING (YOU IMPLEMENT: pricing logic)
  // ============================================================

  private async onNewRequest(tx: MockTransaction) {
    console.log(`New request: ${tx.id}`);

    // Check capacity
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      console.log(`At capacity, ignoring request`);
      return;
    }

    // YOUR LOGIC: Calculate price based on request
    const task = this.getTaskFromServiceDescription(tx.serviceDescription);
    const quote = this.calculateQuote(task);

    // YOUR LOGIC: Decide if you want this job
    if (!this.shouldAcceptJob(task)) {
      console.log(`Declining job: ${tx.id}`);
      return;
    }

    // SDK HANDLES: Transition to QUOTED state with ABI-encoded amount
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const quoteProof = abiCoder.encode(['uint256'], [quote]);
    await this.client.standard.transitionState(tx.id, 'QUOTED', quoteProof);

    console.log(`Quoted ${ethers.formatUnits(quote, 6)} USDC for ${tx.id}`);
  }

  // YOUR IMPLEMENTATION: Pricing logic
  private calculateQuote(metadata: any): bigint {
    switch (this.config.unit) {
      case 'word':
        const words = (metadata.text || '').split(/\s+/).length;
        return this.config.pricePerUnit * BigInt(words);

      case 'token':
        const tokens = this.estimateTokens(metadata.text || '');
        return this.config.pricePerUnit * BigInt(tokens);

      case 'request':
        return this.config.pricePerUnit;

      case 'hour':
        const estimatedHours = this.estimateHours(metadata);
        return this.config.pricePerUnit * BigInt(estimatedHours);

      default:
        return this.config.pricePerUnit;
    }
  }

  // YOUR IMPLEMENTATION: Job acceptance criteria
  private shouldAcceptJob(metadata: any): boolean {
    // Example criteria:
    // - Text not too long
    // - Language supported
    // - Content type allowed
    return true;
  }

  // ============================================================
  // WORK EXECUTION (YOU IMPLEMENT: service logic)
  // ============================================================

  private async onCommitted(tx: MockTransaction) {
    console.log(`Job committed: ${tx.id}`);

    // Track active job
    this.activeJobs.set(tx.id, {
      txId: tx.id,
      metadata: this.getTaskFromServiceDescription(tx.serviceDescription),
      startedAt: Date.now(),
    });

    // SDK HANDLES: Transition to IN_PROGRESS (required before DELIVERED)
    await this.client.standard.transitionState(tx.id, 'IN_PROGRESS');

    try {
      // YOUR LOGIC: Perform the service
      const result = await this.performService(this.getTaskFromServiceDescription(tx.serviceDescription));

      // Get transaction for dispute window
      const txData = await this.client.standard.getTransaction(tx.id);
      const disputeWindow = txData?.disputeWindow || 172800; // default 2 days

      // Encode dispute window as proof (ABI-encoded uint256)
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const proof = abiCoder.encode(['uint256'], [disputeWindow]);

      // SDK HANDLES: Transition to DELIVERED with proof
      await this.client.standard.transitionState(tx.id, 'DELIVERED', proof);

      console.log(`Delivered: ${tx.id}`);

      // Requester (or automation) releases after dispute window

    } catch (error) {
      console.error(`Failed to complete job ${tx.id}:`, error);
      // If you can't complete, the requester can cancel after deadline
      // or you can communicate off-chain to arrange cancellation
    } finally {
      this.activeJobs.delete(tx.id);
    }
  }

  // YOUR IMPLEMENTATION: The actual service
  private async performService(metadata: any): Promise<string> {
    // Example: Translation service
    // Replace with your actual service logic

    const { text, targetLanguage } = metadata;

    // Call your LLM, API, or processing logic
    const result = await this.callLLM({
      prompt: `Translate to ${targetLanguage}: ${text}`,
    });

    return result;
  }

  // YOUR IMPLEMENTATION: Result storage
  private async storeResult(result: string): Promise<{
    resultHash: string;
    resultUrl: string;
  }> {
    // 1. Calculate hash (for on-chain proof)
    const resultHash = ethers.keccak256(ethers.toUtf8Bytes(result));

    // 2. Upload to permanent storage
    // Options: IPFS, Arweave, S3, your own server
    const resultUrl = await this.uploadToIPFS(result);

    return { resultHash, resultUrl };
  }

  // ============================================================
  // SETTLEMENT (SDK handles, you just log)
  // ============================================================

  private async onSettled(tx: MockTransaction) {
    console.log(`Settled: ${tx.id}`);
    console.log(`Earned (gross): ${ethers.formatUnits(tx.amount, 6)} USDC`);

    // YOUR LOGIC: Update your records, analytics, etc.
  }

  // ============================================================
  // DISPUTE HANDLING (Protocol handles resolution)
  // ============================================================

  private async onDispute(tx: MockTransaction) {
    console.log(`Dispute raised on: ${tx.id}`);

    // Protocol handles dispute resolution via mediator
    // You can submit evidence off-chain if needed

    // YOUR LOGIC: Log dispute, notify admin, prepare evidence
  }

  // ============================================================
  // HELPER METHODS (YOUR IMPLEMENTATION)
  // ============================================================

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private estimateHours(metadata: any): number {
    // Your estimation logic
    return 1;
  }

  private async callLLM(params: { prompt: string }): Promise<string> {
    // Your LLM integration
    throw new Error('Implement your LLM call');
  }

  private async uploadToIPFS(content: string): Promise<string> {
    // Your IPFS integration
    throw new Error('Implement your IPFS upload');
  }

  private getTaskFromServiceDescription(serviceDescription: string): any {
    // If you store full task metadata off-chain, look it up by hash here.
    // For mock mode, you can pass a plain description string.
    return { description: serviceDescription };
  }
}

// ============================================================
// USAGE
// ============================================================

const agent = new ProviderAgent({
  name: 'Translation Service',
  description: 'Translate text between languages using GPT-4',
  pricePerUnit: BigInt(10000), // $0.01 per word (6 decimals)
  unit: 'word',
  maxConcurrentJobs: 5,
});

agent.start();
```

## Python Implementation

```python
from agirails import ACTPClient
from eth_abi import encode
from dataclasses import dataclass
from typing import Optional, Dict, Any
import hashlib
import asyncio

@dataclass
class ServiceConfig:
    name: str
    description: str
    price_per_unit: int  # In USDC smallest units (6 decimals)
    unit: str  # 'word', 'token', 'request', 'hour'
    max_concurrent_jobs: int

class ProviderAgent:
    def __init__(self, config: ServiceConfig):
        self.config = config
        self.client: Optional[ACTPClient] = None
        self.wallet: Optional[str] = None
        self.active_jobs: Dict[str, Any] = {}

    async def start(self):
        # SDK handles: wallet connection, contract initialization
        self.client = await ACTPClient.create(
            mode="mainnet",
            private_key=os.environ["AGENT_PRIVATE_KEY"],
            requester_address=os.environ["AGENT_ADDRESS"],
        )
        self.wallet = await self.client.get_address()
        print(f"Provider agent started: {self.wallet}")

        # Use your own indexer or polling to detect new txIds,
        # then call handle_request(tx) with your own transaction payload.

    # YOUR IMPLEMENTATION: Pricing
    def calculate_quote(self, metadata: dict) -> int:
        if self.config.unit == "word":
            words = len(metadata.get("text", "").split())
            return self.config.price_per_unit * words
        return self.config.price_per_unit

    # YOUR IMPLEMENTATION: Service logic
    async def perform_service(self, metadata: dict) -> str:
        # Your service implementation
        raise NotImplementedError("Implement your service")

    # YOUR IMPLEMENTATION: Result storage
    async def store_result(self, result: str) -> tuple[str, str]:
        result_hash = "0x" + hashlib.sha256(result.encode()).hexdigest()
        result_url = await self.upload_to_ipfs(result)
        return result_hash, result_url

    async def handle_request(self, tx):
        task = self.get_task_from_service_description(tx.service_description)
        quote = self.calculate_quote(task)

        # SDK HANDLES: State transition
        quote_proof = "0x" + encode(["uint256"], [quote]).hex()
        await self.client.standard.transition_state(tx.id, "QUOTED", quote_proof)

    async def execute_job(self, tx):
        # SDK HANDLES: State transition (IN_PROGRESS required before DELIVERED)
        await self.client.standard.transition_state(tx.id, "IN_PROGRESS")

        # YOUR LOGIC: Do the work
        task = self.get_task_from_service_description(tx.service_description)
        result = await self.perform_service(task)

        # Get dispute window for proof encoding
        dispute_window = tx.dispute_window or 172800  # default 2 days

        # Encode dispute window as proof (ABI-encoded uint256)
        from eth_abi import encode
        proof = "0x" + encode(["uint256"], [dispute_window]).hex()

        # SDK HANDLES: Delivery with dispute window proof
        await self.client.standard.transition_state(tx.id, "DELIVERED", proof)

    async def upload_to_ipfs(self, content: str) -> str:
        raise NotImplementedError("Implement IPFS upload")

    def get_task_from_service_description(self, service_description: str) -> dict:
        # If you store full task metadata off-chain, look it up by hash here.
        return {"description": service_description}
```

## What You Must Implement

| Component | Purpose | Example |
|-----------|---------|---------|
| `calculateQuote()` | Determine price for request | Words * $0.01 |
| `shouldAcceptJob()` | Filter requests | Check language support |
| `performService()` | Do the actual work | Call GPT-4 API |
| `storeResult()` | Save deliverable | Upload to IPFS |
| `uploadToIPFS()` | Permanent storage | Pinata, Infura IPFS |

## What SDK Handles

| Component | Description |
|-----------|-------------|
| State machine | All 8 states, transitions, validation |
| Escrow | Fund locking, release, refunds |
| Events | Transaction lifecycle notifications |
| Proof recording | Off-chain or attestation (app-specific) |
| Fee deduction | 1% / $0.05 min automatic |
| Dispute flow | Window timing, mediator routing |
| Settlement | Requester releases after dispute window |
