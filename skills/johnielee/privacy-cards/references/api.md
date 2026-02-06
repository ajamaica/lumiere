# Privacy.com API Reference

Complete field documentation for the Privacy.com API.

## Card Schema

| Field                  | Type    | Description                                                     |
| ---------------------- | ------- | --------------------------------------------------------------- |
| `token`                | string  | Globally unique identifier (UUID)                               |
| `type`                 | string  | SINGLE_USE, MERCHANT_LOCKED, UNLOCKED, DIGITAL_WALLET, PHYSICAL |
| `state`                | string  | OPEN, PAUSED, CLOSED, PENDING_ACTIVATION, PENDING_FULFILLMENT   |
| `memo`                 | string  | Custom name/description                                         |
| `last_four`            | string  | Last 4 digits of card number                                    |
| `pan`                  | string  | Full 16-digit card number (enterprise/sandbox only)             |
| `cvv`                  | string  | 3-digit CVV (enterprise/sandbox only)                           |
| `exp_month`            | string  | 2-digit expiry month MM (enterprise/sandbox only)               |
| `exp_year`             | string  | 4-digit expiry year YYYY (enterprise/sandbox only)              |
| `spend_limit`          | integer | Limit in cents                                                  |
| `spend_limit_duration` | string  | TRANSACTION, MONTHLY, ANNUALLY, FOREVER                         |
| `hostname`             | string  | Locked merchant hostname (if merchant-locked)                   |
| `created`              | string  | ISO 8601 timestamp                                              |
| `funding`              | object  | Funding source details                                          |
| `auth_rule_tokens`     | array   | Applied auth rule tokens                                        |

## Create Card Parameters

| Parameter              | Required | Description                           |
| ---------------------- | -------- | ------------------------------------- |
| `type`                 | Yes      | Card type                             |
| `memo`                 | No       | Custom identifier                     |
| `spend_limit`          | No       | Amount in cents                       |
| `spend_limit_duration` | No       | Limit reset period                    |
| `state`                | No       | OPEN or PAUSED (default: OPEN)        |
| `funding_token`        | No       | UUID of funding source                |
| `exp_month`            | No       | Custom expiry month (MM)              |
| `exp_year`             | No       | Custom expiry year (YYYY)             |
| `card_program_token`   | No       | Card program UUID                     |
| `account_token`        | No       | Account UUID (multi-account programs) |
| `pin`                  | No       | Encrypted PIN block (base64)          |

### Physical Card Additional Parameters

> **TODO:** Shipping address schema needs update — provide current fields

## Update Card Parameters

| Parameter              | Description                                |
| ---------------------- | ------------------------------------------ |
| `state`                | OPEN, PAUSED, CLOSED (CLOSED is permanent) |
| `memo`                 | Update description                         |
| `spend_limit`          | New limit in cents                         |
| `spend_limit_duration` | New reset period                           |
| `funding_token`        | Change funding source                      |
| `pin`                  | Update encrypted PIN                       |

## Transaction Schema

| Field                  | Type    | Description                                           |
| ---------------------- | ------- | ----------------------------------------------------- |
| `token`                | string  | Transaction UUID                                      |
| `card_token`           | string  | Associated card UUID                                  |
| `amount`               | integer | Amount in cents (negative = debit)                    |
| `authorization_amount` | integer | Original auth amount                                  |
| `merchant_amount`      | integer | Amount in merchant's currency                         |
| `merchant_currency`    | string  | ISO 4217 currency code                                |
| `acquirer_fee`         | integer | Merchant fee in cents                                 |
| `settled_amount`       | integer | Final settled amount                                  |
| `status`               | string  | PENDING, SETTLING, SETTLED, VOIDED, BOUNCED, DECLINED |
| `result`               | string  | APPROVED or decline reason                            |
| `authorization_code`   | string  | 6-digit auth code                                     |
| `created`              | string  | ISO 8601 timestamp                                    |
| `merchant`             | object  | Merchant details                                      |
| `events`               | array   | Transaction lifecycle events                          |
| `funding`              | array   | Funding breakdown                                     |

## Merchant Schema

| Field         | Description              |
| ------------- | ------------------------ |
| `acceptor_id` | Payment card acceptor ID |
| `descriptor`  | Merchant name            |
| `mcc`         | Merchant category code   |
| `city`        | Merchant city            |
| `state`       | Merchant state           |
| `country`     | Merchant country         |

## Transaction Event Schema

| Field     | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `token`   | Event UUID                                                  |
| `type`    | AUTHORIZATION, AUTHORIZATION_ADVICE, CLEARING, VOID, RETURN |
| `amount`  | Event amount (always positive)                              |
| `result`  | APPROVED or decline reason                                  |
| `created` | ISO 8601 timestamp                                          |

## Funding Source Schema

| Field          | Description                                         |
| -------------- | --------------------------------------------------- |
| `token`        | Funding source UUID                                 |
| `type`         | DEPOSITORY_CHECKING, DEPOSITORY_SAVINGS, CARD_DEBIT |
| `state`        | ENABLED, PENDING                                    |
| `account_name` | Account name                                        |
| `last_four`    | Last 4 digits                                       |
| `nickname`     | Custom name                                         |
| `created`      | ISO 8601 timestamp                                  |

## List Endpoints Query Parameters

### Cards: GET /v1/cards

| Parameter       | Description                            |
| --------------- | -------------------------------------- |
| `card_token`    | Get single card (path param)           |
| `account_token` | Filter by account                      |
| `begin`         | Cards created on/after (YYYY-MM-DD)    |
| `end`           | Cards created before (YYYY-MM-DD)      |
| `page`          | Page number (default: 1)               |
| `page_size`     | Results per page (1-1000, default: 50) |

### Transactions: GET /v1/transactions

| Parameter       | Description                        |
| --------------- | ---------------------------------- |
| `card_token`    | Filter by card                     |
| `account_token` | Filter by account                  |
| `result`        | APPROVED or DECLINED               |
| `begin`         | Transactions on/after (YYYY-MM-DD) |
| `end`           | Transactions before (YYYY-MM-DD)   |
| `page`          | Page number                        |
| `page_size`     | Results per page                   |

## Decline Reasons

| Code                     | Description                            |
| ------------------------ | -------------------------------------- |
| `APPROVED`               | Success                                |
| `CARD_PAUSED`            | Card is paused                         |
| `CARD_CLOSED`            | Card is closed                         |
| `SINGLE_USE_RECHARGED`   | Single-use card already used           |
| `UNAUTHORIZED_MERCHANT`  | Merchant-locked card at wrong merchant |
| `USER_TRANSACTION_LIMIT` | Spend limit exceeded                   |
| `INSUFFICIENT_FUNDS`     | Funding source issue                   |
| `INVALID_CARD_DETAILS`   | Wrong CVV or expiry                    |
| `INCORRECT_PIN`          | PIN verification failed                |
| `FRAUD_ADVICE`           | Declined for risk                      |
| `MERCHANT_BLACKLIST`     | Merchant not allowed                   |
| `BANK_CONNECTION_ERROR`  | Reconnect funding source               |
| `BANK_NOT_VERIFIED`      | Confirm funding source                 |

## Webhook Verification

Verify `X-Privacy-HMAC` header using HMAC-SHA256:

```python
import hmac, hashlib, base64, json

def verify_webhook(api_key: str, body: dict, header_hmac: str) -> bool:
    msg = json.dumps(body, sort_keys=True, separators=(',', ':'))
    computed = base64.b64encode(
        hmac.new(api_key.encode(), msg.encode(), hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(computed, header_hmac)
```

JSON must be: no whitespace, double quotes, keys sorted alphabetically.
