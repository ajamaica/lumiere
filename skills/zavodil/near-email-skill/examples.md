# NEAR Email Code Examples

Complete working examples for integrating NEAR Email.

## Rust Smart Contract Examples

**Warning:** `send_email_plaintext` stores email content PUBLICLY on the NEAR blockchain. Use only for automated notifications (NFT sales, DeFi alerts), never for private data.

### NFT Marketplace - Sale Notification

```rust
use near_sdk::json_types::U128;
use near_sdk::{env, ext_contract, near_bindgen, AccountId, Gas, NearToken, Promise};
use serde::Serialize;
use serde_json::json;

const OUTLAYER: &str = "outlayer.near";

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub enum ExecutionSource {
    Project {
        project_id: String,
        version_key: Option<String>,
    },
}

#[ext_contract(ext_outlayer)]
pub trait OutLayer {
    fn request_execution(
        &mut self,
        source: ExecutionSource,
        resource_limits: Option<serde_json::Value>,
        input_data: Option<String>,
        secrets_ref: Option<serde_json::Value>,
        response_format: Option<String>,
        payer_account_id: Option<AccountId>,
        params: Option<serde_json::Value>,
    );
}

#[near_bindgen]
impl NftMarketplace {
    /// Notify seller when their NFT is sold
    /// WARNING: Email content is PUBLIC on-chain!
    pub fn notify_sale(
        &mut self,
        seller_id: AccountId,
        buyer_id: AccountId,
        token_id: String,
        price: U128,
    ) -> Promise {
        let email_input = json!({
            "action": "send_email_plaintext",
            "to": format!("{}@near.email", seller_id),
            "subject": format!("Your NFT #{} has been sold!", token_id),
            "body": format!(
                "Great news!\n\n\
                Your NFT #{} has been purchased by {} for {} NEAR.\n\n\
                Transaction ID: {}\n\n\
                Thanks for using our marketplace!",
                token_id,
                buyer_id,
                price.0 as f64 / 1e24,
                env::block_timestamp()
            )
        });

        ext_outlayer::ext(OUTLAYER.parse().unwrap())
            .with_static_gas(Gas::from_tgas(100))
            .with_attached_deposit(NearToken::from_millinear(25))
            .request_execution(
                ExecutionSource::Project {
                    project_id: "zavodil.near/near-email".to_string(),
                    version_key: None,
                },
                None,                        // resource_limits (default)
                Some(email_input.to_string()),
                None,                        // secrets_ref (not needed)
                Some("Json".to_string()),
                None,
                None,
            )
    }
}
```

### DeFi Lending - Liquidation Warning

```rust
#[near_bindgen]
impl LendingProtocol {
    /// Alert user when their position is at risk
    /// WARNING: Email content is PUBLIC on-chain!
    pub fn send_liquidation_warning(
        &mut self,
        user_id: AccountId,
        health_factor: f64,
        collateral_usd: f64,
        debt_usd: f64,
    ) -> Promise {
        let urgency = if health_factor < 1.05 { "CRITICAL" } else { "Warning" };

        let email_input = json!({
            "action": "send_email_plaintext",
            "to": format!("{}@near.email", user_id),
            "subject": format!("[{}] Your position is at liquidation risk", urgency),
            "body": format!(
                "Your lending position requires attention.\n\n\
                Health Factor: {:.4}\n\
                Collateral Value: ${:.2}\n\
                Debt Value: ${:.2}\n\n\
                {}\n\n\
                Take action at: https://your-defi-app.near.page",
                health_factor,
                collateral_usd,
                debt_usd,
                if health_factor < 1.05 {
                    "IMMEDIATE ACTION REQUIRED: Your position may be liquidated within minutes!"
                } else {
                    "Please add collateral or repay debt to improve your health factor."
                }
            )
        });

        ext_outlayer::ext(OUTLAYER.parse().unwrap())
            .with_static_gas(Gas::from_tgas(100))
            .with_attached_deposit(NearToken::from_millinear(25))
            .request_execution(
                ExecutionSource::Project {
                    project_id: "zavodil.near/near-email".to_string(),
                    version_key: None,
                },
                None,
                Some(email_input.to_string()),
                None,
                Some("Json".to_string()),
                None,
                None,
            )
    }
}
```

### DAO Governance - Voting Reminder

```rust
#[near_bindgen]
impl DaoContract {
    /// Remind members about an active proposal
    /// WARNING: Email content is PUBLIC on-chain!
    pub fn send_voting_reminder(
        &mut self,
        member_id: AccountId,
        proposal_id: u64,
        proposal_title: String,
        deadline: u64,
    ) -> Promise {
        let hours_left = (deadline - env::block_timestamp()) / 3_600_000_000_000;

        let email_input = json!({
            "action": "send_email_plaintext",
            "to": format!("{}@near.email", member_id),
            "subject": format!("Vote Now: {} ({}h left)", proposal_title, hours_left),
            "body": format!(
                "A proposal in your DAO needs your vote.\n\n\
                Proposal #{}: {}\n\
                Time Remaining: {} hours\n\n\
                Cast your vote: https://your-dao.near.page/proposals/{}\n\n\
                Your participation matters!",
                proposal_id,
                proposal_title,
                hours_left,
                proposal_id
            )
        });

        ext_outlayer::ext(OUTLAYER.parse().unwrap())
            .with_static_gas(Gas::from_tgas(100))
            .with_attached_deposit(NearToken::from_millinear(25))
            .request_execution(
                ExecutionSource::Project {
                    project_id: "zavodil.near/near-email".to_string(),
                    version_key: None,
                },
                None,
                Some(email_input.to_string()),
                None,
                Some("Json".to_string()),
                None,
                None,
            )
    }
}
```

---

## JavaScript/TypeScript Examples

AI agents can integrate via two methods:

| Method | Best For | Payment |
|--------|----------|---------|
| **Payment Key (HTTPS)** | Server-side agents, high volume | Pre-paid balance (USDC/USDT) |
| **NEAR Transaction** | Browser wallets, direct signing | Deposit (unused portion refunded) |

---

### Option A: Payment Key (Simple HTTPS)

**Note:** HTTPS API responses have an `output` wrapper: `result.output.send_pubkey`. This is different from NEAR Transaction which returns the result directly.

```typescript
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { chacha20poly1305 } from '@noble/ciphers/chacha';

const OUTLAYER_API = 'https://api.outlayer.fastnear.com';
const PROJECT_ID = 'zavodil.near/near-email';
const PAYMENT_KEY = 'your-account.near:nonce:secret';

// Send email (plaintext - simplest option)
async function sendEmail(to: string, subject: string, body: string) {
  const response = await fetch(`${OUTLAYER_API}/call/outlayer.near/${PROJECT_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Key': PAYMENT_KEY,
    },
    body: JSON.stringify({
      input: { action: 'send_email_plaintext', to, subject, body },
    }),
  });
  return response.json();
}

// Read emails (requires ECIES decryption)
async function getEmails() {
  // Generate ephemeral keypair for response decryption
  const ephemeralPrivkey = secp256k1.utils.randomPrivateKey();
  const ephemeralPubkey = secp256k1.getPublicKey(ephemeralPrivkey, true);
  const ephemeralPubkeyHex = Buffer.from(ephemeralPubkey).toString('hex');

  const response = await fetch(`${OUTLAYER_API}/call/outlayer.near/${PROJECT_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Key': PAYMENT_KEY,
    },
    body: JSON.stringify({
      input: {
        action: 'get_emails',
        ephemeral_pubkey: ephemeralPubkeyHex,
        max_output_size: 1500000,
      },
    }),
  });

  const result = await response.json();

  // Decrypt response (EC01 format: magic + sender_pubkey + nonce + ciphertext)
  const encrypted = Buffer.from(result.output.encrypted_data, 'base64');
  const senderPubkey = encrypted.slice(4, 37);
  const nonce = encrypted.slice(37, 49);
  const ciphertext = encrypted.slice(49);

  // ECDH key exchange
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivkey, senderPubkey, true);
  const key = sha256(sharedPoint.slice(1));

  // Decrypt with ChaCha20-Poly1305
  const cipher = chacha20poly1305(key, nonce);
  const plaintext = cipher.decrypt(ciphertext);
  const emailData = JSON.parse(new TextDecoder().decode(plaintext));

  return {
    inbox: emailData.inbox,
    sent: emailData.sent,
    inboxCount: result.output.inbox_count,
    sentCount: result.output.sent_count,
  };
}

// Usage
await sendEmail('recipient@gmail.com', 'Hello', 'Test email from AI agent');

const { inbox, inboxCount } = await getEmails();
console.log(`You have ${inboxCount} emails`);
inbox.forEach(email => console.log(`From: ${email.from}`));
```

---

### Option B: NEAR Transaction (Per-Use)

Sign transactions directly with NEAR wallet. Attach deposit as a limit - unused portion is automatically refunded. This is how [mail.near.email](https://mail.near.email) works.

**CRITICAL: NEAR Transaction results are in the `outlayer.near` receipt's `SuccessValue` (base64-encoded JSON). Find the receipt where `executor_id === 'outlayer.near'`. The result is `{ "success": true, ... }` - NO `output` wrapper. Use `parseTransactionResult()` to extract it.**

```typescript
import { connect, keyStores } from 'near-api-js';

const OUTLAYER_CONTRACT = 'outlayer.near';
const PROJECT_ID = 'zavodil.near/near-email';

// Required resource limits for NEAR Email
const RESOURCE_LIMITS = {
  max_memory_mb: 512,
  max_instructions: 2000000000,
  max_execution_seconds: 120,
};

// Connect to NEAR
const near = await connect({
  networkId: 'mainnet',
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: 'https://rpc.mainnet.near.org',
});
const account = await near.account('your-account.near');

// REQUIRED: Parse output from outlayer.near receipt's SuccessValue
// Returns JSON directly: { success: true, ... } - NO "output" wrapper!
function parseTransactionResult(result: any): any {
  // Find receipt from outlayer.near contract (contains the execution result)
  const outlayerReceipt = result.receipts_outcome.find(
    (r: any) => r.outcome.executor_id === 'outlayer.near' && r.outcome.status.SuccessValue
  );
  if (!outlayerReceipt) {
    throw new Error('No SuccessValue from outlayer.near');
  }
  const decoded = Buffer.from(outlayerReceipt.outcome.status.SuccessValue, 'base64').toString();
  return JSON.parse(decoded); // { success: true, ... } - directly, no wrapper
}

// Send email via NEAR transaction
async function sendEmail(to: string, subject: string, body: string) {
  const input = JSON.stringify({
    action: 'send_email_plaintext',
    to,
    subject,
    body,
  });

  const result = await account.functionCall({
    contractId: OUTLAYER_CONTRACT,
    methodName: 'request_execution',
    args: {
      source: { Project: { project_id: PROJECT_ID, version_key: null } },
      input_data: input,
      resource_limits: RESOURCE_LIMITS,
      response_format: 'Json',
    },
    gas: BigInt('100000000000000'), // 100 TGas
    attachedDeposit: BigInt('25000000000000000000000'), // deposit, unused refunded
  });

  return parseTransactionResult(result);
}

// Usage
const output = await sendEmail('recipient@gmail.com', 'Hello', 'Sent via NEAR transaction!');
console.log('Email sent:', output); // { success: true, message_id: "..." }
```

---

### Complete AI Agent with Encryption (Payment Key)

```typescript
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';

const OUTLAYER_API = 'https://api.outlayer.fastnear.com';
const PROJECT_ID = 'zavodil.near/near-email';

class NearEmailAgent {
  private paymentKey: string;
  private sendPubkey: Uint8Array | null = null; // Cached sender pubkey

  constructor(paymentKey: string) {
    this.paymentKey = paymentKey;
  }

  // Generate ephemeral keypair for request/response encryption
  private generateEphemeralKey(): { privkey: Uint8Array; pubkeyHex: string } {
    const privkey = secp256k1.utils.randomPrivateKey();
    const pubkey = secp256k1.getPublicKey(privkey, true);
    return {
      privkey,
      pubkeyHex: Buffer.from(pubkey).toString('hex'),
    };
  }

  // Encrypt payload using ECDH + ChaCha20-Poly1305 (EC01 format)
  private encryptPayload(recipientPubkey: Uint8Array, data: object): string {
    const ECDH_MAGIC = new Uint8Array([0x45, 0x43, 0x30, 0x31]); // "EC01"
    const plaintext = new TextEncoder().encode(JSON.stringify(data));

    // Generate ephemeral keypair for this encryption
    const ephemeralPrivkey = secp256k1.utils.randomPrivateKey();
    const ephemeralPubkey = secp256k1.getPublicKey(ephemeralPrivkey, true);

    // ECDH key exchange
    const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivkey, recipientPubkey, true);
    const sharedX = sharedPoint.slice(1);
    const key = sha256(sharedX);

    // Encrypt with ChaCha20-Poly1305
    const nonce = randomBytes(12);
    const cipher = chacha20poly1305(key, nonce);
    const ciphertext = cipher.encrypt(plaintext);

    // Format: EC01 || ephemeral_pubkey (33) || nonce (12) || ciphertext
    const output = new Uint8Array(4 + 33 + 12 + ciphertext.length);
    output.set(ECDH_MAGIC, 0);
    output.set(ephemeralPubkey, 4);
    output.set(nonce, 4 + 33);
    output.set(ciphertext, 4 + 33 + 12);

    return Buffer.from(output).toString('base64');
  }

  // Decrypt ECIES response
  private decryptResponse(encryptedBase64: string, privkey: Uint8Array): any {
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    // Check magic bytes
    const magic = encrypted.slice(0, 4).toString();
    if (magic !== 'EC01') {
      throw new Error('Invalid encryption format');
    }

    // Parse: EC01 (4) || ephemeral_pubkey (33) || nonce (12) || ciphertext
    const ephemeralPubkey = encrypted.slice(4, 37);
    const nonce = encrypted.slice(37, 49);
    const ciphertext = encrypted.slice(49);

    // ECDH
    const sharedPoint = secp256k1.getSharedSecret(privkey, ephemeralPubkey, true);
    const sharedX = sharedPoint.slice(1);
    const key = sha256(sharedX);

    // Decrypt
    const cipher = chacha20poly1305(key, nonce);
    const plaintext = cipher.decrypt(ciphertext);

    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  // Get sender's pubkey (cached - it's deterministic)
  async getSendPubkey(): Promise<Uint8Array> {
    if (this.sendPubkey) {
      return this.sendPubkey;
    }

    const response = await fetch(`${OUTLAYER_API}/call/outlayer.near/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': this.paymentKey,
      },
      body: JSON.stringify({
        input: { action: 'get_send_pubkey' },
      }),
    });

    const result = await response.json();
    if (result.status === 'failed') {
      throw new Error(result.error || 'Failed to get send pubkey');
    }

    this.sendPubkey = Buffer.from(result.output.send_pubkey, 'hex');
    return this.sendPubkey;
  }

  /**
   * Send an email with encrypted payload.
   * @param needInbox - If true, returns encrypted inbox/sent in response. Default: false (faster).
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: Array<{ filename: string; content_type: string; data: string; size: number }>,
    needInbox = false
  ): Promise<{ success: boolean; messageId?: string }> {
    // Get sender's pubkey for encrypting the payload
    const sendPubkey = await this.getSendPubkey();

    // Encrypt the email payload
    const payload = { to, subject, body, attachments: attachments || [] };
    const encryptedData = this.encryptPayload(sendPubkey, payload);

    // Build request - ephemeral_pubkey is optional
    const input: Record<string, unknown> = {
      action: 'send_email',
      encrypted_data: encryptedData,
    };

    // Only generate ephemeral key if we need inbox/sent in response
    if (needInbox) {
      const ephemeral = this.generateEphemeralKey();
      input.ephemeral_pubkey = ephemeral.pubkeyHex;
    }

    const response = await fetch(`${OUTLAYER_API}/call/outlayer.near/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': this.paymentKey,
      },
      body: JSON.stringify({ input }),
    });

    const result = await response.json();

    if (result.status === 'failed') {
      throw new Error(result.error || 'Failed to send email');
    }

    return {
      success: true,
      messageId: result.output?.message_id,
    };
  }

  async getEmails(inboxOffset = 0, sentOffset = 0): Promise<{
    inbox: any[];
    sent: any[];
    inboxCount: number;
    sentCount: number;
  }> {
    const ephemeral = this.generateEphemeralKey();

    const response = await fetch(`${OUTLAYER_API}/call/outlayer.near/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': this.paymentKey,
      },
      body: JSON.stringify({
        input: {
          action: 'get_emails',
          ephemeral_pubkey: ephemeral.pubkeyHex,
          inbox_offset: inboxOffset,
          sent_offset: sentOffset,
          max_output_size: 1500000,
        },
      }),
    });

    const result = await response.json();

    if (result.status === 'failed') {
      throw new Error(result.error || 'Failed to get emails');
    }

    // Decrypt the response
    const decrypted = this.decryptResponse(result.output.encrypted_data, ephemeral.privkey);

    return {
      inbox: decrypted.inbox,
      sent: decrypted.sent,
      inboxCount: result.output.inbox_count,
      sentCount: result.output.sent_count,
    };
  }

  async getEmailCount(): Promise<{ inbox: number; sent: number }> {
    const response = await fetch(`${OUTLAYER_API}/call/outlayer.near/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': this.paymentKey,
      },
      body: JSON.stringify({
        input: { action: 'get_email_count' },
      }),
    });

    const result = await response.json();

    return {
      inbox: result.output.inbox_count,
      sent: result.output.sent_count,
    };
  }

  async deleteEmail(emailId: string): Promise<boolean> {
    const ephemeral = this.generateEphemeralKey();

    const response = await fetch(`${OUTLAYER_API}/call/outlayer.near/${PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Key': this.paymentKey,
      },
      body: JSON.stringify({
        input: {
          action: 'delete_email',
          email_id: emailId,
          ephemeral_pubkey: ephemeral.pubkeyHex,
        },
      }),
    });

    const result = await response.json();
    return result.output?.deleted === true;
  }
}

// Usage
const agent = new NearEmailAgent('your-account.near:nonce:secret');

// Send email
await agent.sendEmail(
  'friend@gmail.com',
  'Hello from NEAR!',
  'This email was sent by an AI agent on the NEAR blockchain.'
);

// Check inbox
const { inbox, inboxCount } = await agent.getEmails();
console.log(`You have ${inboxCount} emails`);
inbox.forEach(email => {
  console.log(`From: ${email.from}, Subject: ${email.subject}`);
});
```

---

## Python Examples

### Option A: Payment Key (Simple HTTPS)

```python
import os
import hashlib
import base64
import json
import requests
from coincurve import PrivateKey, PublicKey
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

OUTLAYER_API = "https://api.outlayer.fastnear.com"
PROJECT_ID = "zavodil.near/near-email"
PAYMENT_KEY = os.environ.get("OUTLAYER_PAYMENT_KEY", "your-account.near:nonce:secret")

# Send email (plaintext - simplest option)
def send_email(to: str, subject: str, body: str) -> dict:
    response = requests.post(
        f"{OUTLAYER_API}/call/outlayer.near/{PROJECT_ID}",
        headers={"Content-Type": "application/json", "X-Payment-Key": PAYMENT_KEY},
        json={"input": {"action": "send_email_plaintext", "to": to, "subject": subject, "body": body}},
    )
    return response.json()

# Read emails (requires ECIES decryption)
def get_emails() -> dict:
    # Generate ephemeral keypair for response decryption
    ephemeral_privkey = PrivateKey()
    ephemeral_pubkey_hex = ephemeral_privkey.public_key.format(compressed=True).hex()

    response = requests.post(
        f"{OUTLAYER_API}/call/outlayer.near/{PROJECT_ID}",
        headers={"Content-Type": "application/json", "X-Payment-Key": PAYMENT_KEY},
        json={"input": {"action": "get_emails", "ephemeral_pubkey": ephemeral_pubkey_hex, "max_output_size": 1500000}},
    )
    result = response.json()

    # Decrypt response (EC01 format: magic + sender_pubkey + nonce + ciphertext)
    encrypted = base64.b64decode(result["output"]["encrypted_data"])
    sender_pubkey = PublicKey(encrypted[4:37])
    nonce = encrypted[37:49]
    ciphertext = encrypted[49:]

    # ECDH key exchange
    shared_point = sender_pubkey.multiply(ephemeral_privkey.secret)
    shared_x = shared_point.format(compressed=True)[1:]
    key = hashlib.sha256(shared_x).digest()

    # Decrypt with ChaCha20-Poly1305
    cipher = ChaCha20Poly1305(key)
    plaintext = cipher.decrypt(nonce, ciphertext, None)
    email_data = json.loads(plaintext.decode())

    return {
        "inbox": email_data.get("inbox", []),
        "sent": email_data.get("sent", []),
        "inbox_count": result["output"].get("inbox_count", 0),
        "sent_count": result["output"].get("sent_count", 0),
    }

# Usage
send_email("recipient@gmail.com", "Hello", "Test email from Python")

emails = get_emails()
print(f"Inbox: {emails['inbox_count']} emails")
for email in emails["inbox"]:
    print(f"  From: {email['from']}, Subject: {email['subject']}")
```

---

### Option B: NEAR Transaction (Per-Use)

```python
from py_near.account import Account
import asyncio
import json
import re

OUTLAYER_CONTRACT = "outlayer.near"
PROJECT_ID = "zavodil.near/near-email"

# Required resource limits for NEAR Email
RESOURCE_LIMITS = {
    "max_memory_mb": 512,
    "max_instructions": 2000000000,
    "max_execution_seconds": 120,
}


def parse_transaction_result(result) -> dict:
    """Parse output from outlayer.near receipt's SuccessValue (base64 JSON).
    Returns: { success: True, ... } - directly, NO 'output' wrapper!
    """
    import base64
    # Find receipt from outlayer.near contract (contains the execution result)
    outlayer_receipt = next(
        (r for r in result.receipts_outcome
         if r.outcome.executor_id == "outlayer.near" and r.outcome.status.get("SuccessValue")),
        None
    )
    if not outlayer_receipt:
        raise ValueError("No SuccessValue from outlayer.near")
    success_value = outlayer_receipt.outcome.status.get("SuccessValue")
    decoded = base64.b64decode(success_value).decode()
    return json.loads(decoded)  # { success: True, ... } - directly


async def send_email(account: Account, to: str, subject: str, body: str):
    input_data = json.dumps({
        "action": "send_email_plaintext",
        "to": to,
        "subject": subject,
        "body": body,
    })

    result = await account.function_call(
        OUTLAYER_CONTRACT,
        "request_execution",
        {
            "source": {"Project": {"project_id": PROJECT_ID, "version_key": None}},
            "input_data": input_data,
            "resource_limits": RESOURCE_LIMITS,
            "response_format": "Json",
        },
        gas=100_000_000_000_000,  # 100 TGas
        deposit=25_000_000_000_000_000_000_000,  # deposit, unused refunded
    )

    return parse_transaction_result(result)

# Usage
account = Account("your-account.near", private_key="ed25519:...")
asyncio.run(send_email(account, "recipient@gmail.com", "Hello", "Sent via NEAR!"))
```

---

### Complete AI Agent with Encryption (Payment Key)

```python
import json
import hashlib
import secrets
from typing import Optional, List, Dict, Any
import requests
from coincurve import PrivateKey, PublicKey
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

OUTLAYER_API = "https://api.outlayer.fastnear.com"
PROJECT_ID = "zavodil.near/near-email"


class NearEmailAgent:
    def __init__(self, payment_key: str):
        self.payment_key = payment_key
        self._send_pubkey: Optional[bytes] = None  # Cached sender pubkey

    def _generate_ephemeral_key(self) -> tuple[PrivateKey, str]:
        """Generate ephemeral keypair for encryption"""
        privkey = PrivateKey()
        pubkey_hex = privkey.public_key.format(compressed=True).hex()
        return privkey, pubkey_hex

    def _encrypt_payload(self, recipient_pubkey: bytes, data: dict) -> str:
        """Encrypt payload using ECDH + ChaCha20-Poly1305 (EC01 format)"""
        import base64

        ECDH_MAGIC = b"EC01"
        plaintext = json.dumps(data).encode()

        # Parse recipient public key
        recipient_pk = PublicKey(recipient_pubkey)

        # Generate ephemeral keypair
        ephemeral_privkey = PrivateKey()
        ephemeral_pubkey = ephemeral_privkey.public_key.format(compressed=True)

        # ECDH: shared_secret = ephemeral_priv * recipient_pub
        shared_point = recipient_pk.multiply(ephemeral_privkey.secret)
        shared_x = shared_point.format(compressed=True)[1:]  # Skip prefix byte

        # Derive key: SHA256(shared_x)
        key = hashlib.sha256(shared_x).digest()

        # Encrypt with ChaCha20-Poly1305
        nonce = secrets.token_bytes(12)
        cipher = ChaCha20Poly1305(key)
        ciphertext = cipher.encrypt(nonce, plaintext, None)

        # Format: EC01 || ephemeral_pubkey (33) || nonce (12) || ciphertext
        output = ECDH_MAGIC + ephemeral_pubkey + nonce + ciphertext
        return base64.b64encode(output).decode()

    def _decrypt_response(self, encrypted_base64: str, privkey: PrivateKey) -> dict:
        """Decrypt EC01 encrypted response"""
        import base64

        encrypted = base64.b64decode(encrypted_base64)

        # Check magic
        if encrypted[:4] != b"EC01":
            raise ValueError("Invalid encryption format")

        # Parse: EC01 (4) || ephemeral_pubkey (33) || nonce (12) || ciphertext
        ephemeral_pubkey = PublicKey(encrypted[4:37])
        nonce = encrypted[37:49]
        ciphertext = encrypted[49:]

        # ECDH
        shared_point = ephemeral_pubkey.multiply(privkey.secret)
        shared_x = shared_point.format(compressed=True)[1:]
        key = hashlib.sha256(shared_x).digest()

        # Decrypt
        cipher = ChaCha20Poly1305(key)
        plaintext = cipher.decrypt(nonce, ciphertext, None)

        return json.loads(plaintext.decode())

    def _call_api(self, input_data: dict) -> dict:
        """Make API call to OutLayer"""
        response = requests.post(
            f"{OUTLAYER_API}/call/outlayer.near/{PROJECT_ID}",
            headers={
                "Content-Type": "application/json",
                "X-Payment-Key": self.payment_key,
            },
            json={"input": input_data},
        )
        response.raise_for_status()
        return response.json()

    def get_send_pubkey(self) -> bytes:
        """Get sender's pubkey (cached - it's deterministic)"""
        if self._send_pubkey:
            return self._send_pubkey

        result = self._call_api({"action": "get_send_pubkey"})

        if result.get("status") == "failed":
            raise RuntimeError(result.get("error", "Failed to get send pubkey"))

        self._send_pubkey = bytes.fromhex(result["output"]["send_pubkey"])
        return self._send_pubkey

    def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
        need_inbox: bool = False,
    ) -> dict:
        """
        Send an email (encrypted).

        Args:
            need_inbox: If True, returns encrypted inbox/sent in response. Default: False (faster).
        """
        # Get sender's pubkey for encrypting the payload
        send_pubkey = self.get_send_pubkey()

        # Encrypt the email payload
        payload = {"to": to, "subject": subject, "body": body, "attachments": attachments or []}
        encrypted_data = self._encrypt_payload(send_pubkey, payload)

        # Build request - ephemeral_pubkey is optional
        input_data = {
            "action": "send_email",
            "encrypted_data": encrypted_data,
        }

        # Only generate ephemeral key if we need inbox/sent in response
        if need_inbox:
            _, ephemeral_pubkey_hex = self._generate_ephemeral_key()
            input_data["ephemeral_pubkey"] = ephemeral_pubkey_hex

        result = self._call_api(input_data)

        if result.get("status") == "failed":
            raise RuntimeError(result.get("error", "Failed to send email"))

        return {"success": True, "message_id": result.get("output", {}).get("message_id")}

    def get_emails(
        self, inbox_offset: int = 0, sent_offset: int = 0
    ) -> dict:
        """Fetch inbox and sent emails"""
        privkey, pubkey_hex = self._generate_ephemeral_key()

        result = self._call_api({
            "action": "get_emails",
            "ephemeral_pubkey": pubkey_hex,
            "inbox_offset": inbox_offset,
            "sent_offset": sent_offset,
            "max_output_size": 1500000,
        })

        if result.get("status") == "failed":
            raise RuntimeError(result.get("error", "Failed to get emails"))

        output = result.get("output", {})
        decrypted = self._decrypt_response(output["encrypted_data"], privkey)

        return {
            "inbox": decrypted.get("inbox", []),
            "sent": decrypted.get("sent", []),
            "inbox_count": output.get("inbox_count", 0),
            "sent_count": output.get("sent_count", 0),
        }

    def get_email_count(self) -> dict:
        """Get inbox and sent counts"""
        result = self._call_api({"action": "get_email_count"})

        output = result.get("output", {})
        return {
            "inbox": output.get("inbox_count", 0),
            "sent": output.get("sent_count", 0),
        }

    def delete_email(self, email_id: str) -> bool:
        """Delete an email"""
        _, pubkey_hex = self._generate_ephemeral_key()

        result = self._call_api({
            "action": "delete_email",
            "email_id": email_id,
            "ephemeral_pubkey": pubkey_hex,
        })

        return result.get("output", {}).get("deleted", False)


# Usage
if __name__ == "__main__":
    import os

    agent = NearEmailAgent(os.environ["OUTLAYER_PAYMENT_KEY"])

    # Send email
    result = agent.send_email(
        to="friend@gmail.com",
        subject="Hello from Python AI Agent",
        body="This email was sent by an AI agent running on NEAR blockchain."
    )
    print(f"Email sent: {result}")

    # Check inbox
    emails = agent.get_emails()
    print(f"Inbox: {emails['inbox_count']} emails")
    for email in emails["inbox"]:
        print(f"  From: {email['from']}, Subject: {email['subject']}")
```

### Dependencies

```bash
pip install requests coincurve cryptography
```

---

## Sending Attachments

### JavaScript

```javascript
import * as fs from 'fs';

const fileBuffer = fs.readFileSync('document.pdf');
const base64Data = fileBuffer.toString('base64');

await agent.sendEmail(
  'recipient@example.com',
  'Document attached',
  'Please find the document attached.',
  [
    {
      filename: 'document.pdf',
      content_type: 'application/pdf',
      data: base64Data,
      size: fileBuffer.length,
    },
  ]
);
```

### Python

```python
import base64

with open("document.pdf", "rb") as f:
    file_data = f.read()

agent.send_email(
    to="recipient@example.com",
    subject="Document attached",
    body="Please find the document attached.",
    attachments=[
        {
            "filename": "document.pdf",
            "content_type": "application/pdf",
            "data": base64.b64encode(file_data).decode(),
            "size": len(file_data),
        }
    ],
)
```

---

## Complete NEAR Transaction Agent (JavaScript)

Full agent implementation using NEAR transactions with private key (no Payment Key needed):

```typescript
import { connect, keyStores, KeyPair } from 'near-api-js';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';

const OUTLAYER_CONTRACT = 'outlayer.near';
const PROJECT_ID = 'zavodil.near/near-email';

// Required resource limits for NEAR Email
const RESOURCE_LIMITS = {
  max_memory_mb: 512,
  max_instructions: 2000000000,
  max_execution_seconds: 120,
};

class NearEmailTransactionAgent {
  private account: any;
  private sendPubkey: Uint8Array | null = null;

  static async create(accountId: string, privateKey: string): Promise<NearEmailTransactionAgent> {
    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey('mainnet', accountId, KeyPair.fromString(privateKey));

    const near = await connect({
      networkId: 'mainnet',
      keyStore,
      nodeUrl: 'https://rpc.mainnet.near.org',
    });

    const agent = new NearEmailTransactionAgent();
    agent.account = await near.account(accountId);
    return agent;
  }

  // Parse output from outlayer.near receipt's SuccessValue (base64 JSON)
  // Returns: { success: true, ... } - directly, NO "output" wrapper!
  private parseTransactionResult(result: any): any {
    // Find receipt from outlayer.near contract (contains the execution result)
    const outlayerReceipt = result.receipts_outcome.find(
      (r: any) => r.outcome.executor_id === 'outlayer.near' && r.outcome.status.SuccessValue
    );
    if (!outlayerReceipt) {
      throw new Error('No SuccessValue from outlayer.near');
    }
    const decoded = Buffer.from(outlayerReceipt.outcome.status.SuccessValue, 'base64').toString();
    return JSON.parse(decoded); // { success: true, ... } - directly, no wrapper
  }

  private generateEphemeralKey(): { privkey: Uint8Array; pubkeyHex: string } {
    const privkey = secp256k1.utils.randomPrivateKey();
    const pubkey = secp256k1.getPublicKey(privkey, true);
    return { privkey, pubkeyHex: Buffer.from(pubkey).toString('hex') };
  }

  private encryptPayload(recipientPubkey: Uint8Array, data: object): string {
    const ECDH_MAGIC = new Uint8Array([0x45, 0x43, 0x30, 0x31]);
    const plaintext = new TextEncoder().encode(JSON.stringify(data));

    const ephemeralPrivkey = secp256k1.utils.randomPrivateKey();
    const ephemeralPubkey = secp256k1.getPublicKey(ephemeralPrivkey, true);

    const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivkey, recipientPubkey, true);
    const key = sha256(sharedPoint.slice(1));

    const nonce = randomBytes(12);
    const cipher = chacha20poly1305(key, nonce);
    const ciphertext = cipher.encrypt(plaintext);

    const output = new Uint8Array(4 + 33 + 12 + ciphertext.length);
    output.set(ECDH_MAGIC, 0);
    output.set(ephemeralPubkey, 4);
    output.set(nonce, 4 + 33);
    output.set(ciphertext, 4 + 33 + 12);

    return Buffer.from(output).toString('base64');
  }

  private decryptResponse(encryptedBase64: string, privkey: Uint8Array): any {
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    if (encrypted.slice(0, 4).toString() !== 'EC01') throw new Error('Invalid format');

    const ephemeralPubkey = encrypted.slice(4, 37);
    const nonce = encrypted.slice(37, 49);
    const ciphertext = encrypted.slice(49);

    const sharedPoint = secp256k1.getSharedSecret(privkey, ephemeralPubkey, true);
    const key = sha256(sharedPoint.slice(1));
    const cipher = chacha20poly1305(key, nonce);

    return JSON.parse(new TextDecoder().decode(cipher.decrypt(ciphertext)));
  }

  async getSendPubkey(): Promise<Uint8Array> {
    if (this.sendPubkey) return this.sendPubkey;

    const result = await this.account.functionCall({
      contractId: OUTLAYER_CONTRACT,
      methodName: 'request_execution',
      args: {
        source: { Project: { project_id: PROJECT_ID, version_key: null } },
        input_data: JSON.stringify({ action: 'get_send_pubkey' }),
        resource_limits: RESOURCE_LIMITS,
        response_format: 'Json',
      },
      gas: BigInt('100000000000000'),
      attachedDeposit: BigInt('25000000000000000000000'),
    });

    const output = this.parseTransactionResult(result);
    this.sendPubkey = Buffer.from(output.send_pubkey, 'hex');
    return this.sendPubkey;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string }> {
    const sendPubkey = await this.getSendPubkey();
    const encryptedData = this.encryptPayload(sendPubkey, { to, subject, body, attachments: [] });

    const result = await this.account.functionCall({
      contractId: OUTLAYER_CONTRACT,
      methodName: 'request_execution',
      args: {
        source: { Project: { project_id: PROJECT_ID, version_key: null } },
        input_data: JSON.stringify({ action: 'send_email', encrypted_data: encryptedData }),
        resource_limits: RESOURCE_LIMITS,
        response_format: 'Json',
      },
      gas: BigInt('100000000000000'),
      attachedDeposit: BigInt('25000000000000000000000'),
    });

    const output = this.parseTransactionResult(result);
    return { success: output.success, messageId: output.message_id };
  }

  async getEmails(inboxOffset = 0, sentOffset = 0): Promise<{ inbox: any[]; sent: any[]; inboxCount: number; sentCount: number }> {
    const ephemeral = this.generateEphemeralKey();

    const result = await this.account.functionCall({
      contractId: OUTLAYER_CONTRACT,
      methodName: 'request_execution',
      args: {
        source: { Project: { project_id: PROJECT_ID, version_key: null } },
        input_data: JSON.stringify({
          action: 'get_emails',
          ephemeral_pubkey: ephemeral.pubkeyHex,
          inbox_offset: inboxOffset,
          sent_offset: sentOffset,
          max_output_size: 1500000,
        }),
        resource_limits: RESOURCE_LIMITS,
        response_format: 'Json',
      },
      gas: BigInt('100000000000000'),
      attachedDeposit: BigInt('25000000000000000000000'),
    });

    const output = this.parseTransactionResult(result);
    const decrypted = this.decryptResponse(output.encrypted_data, ephemeral.privkey);

    return {
      inbox: decrypted.inbox,
      sent: decrypted.sent,
      inboxCount: output.inbox_count,
      sentCount: output.sent_count,
    };
  }

  async getEmailCount(): Promise<{ inbox: number; sent: number }> {
    const result = await this.account.functionCall({
      contractId: OUTLAYER_CONTRACT,
      methodName: 'request_execution',
      args: {
        source: { Project: { project_id: PROJECT_ID, version_key: null } },
        input_data: JSON.stringify({ action: 'get_email_count' }),
        resource_limits: RESOURCE_LIMITS,
        response_format: 'Json',
      },
      gas: BigInt('100000000000000'),
      attachedDeposit: BigInt('25000000000000000000000'),
    });

    const output = this.parseTransactionResult(result);
    return { inbox: output.inbox_count, sent: output.sent_count };
  }
}

// Usage
const agent = await NearEmailTransactionAgent.create('your-account.near', 'ed25519:...');

// Get email count
const counts = await agent.getEmailCount();
console.log(`Inbox: ${counts.inbox}, Sent: ${counts.sent}`);

// Read emails
const emails = await agent.getEmails();
emails.inbox.forEach(email => console.log(`From: ${email.from}, Subject: ${email.subject}`));

// Send email
await agent.sendEmail('friend@gmail.com', 'Hello', 'Email from NEAR transaction!');
```
