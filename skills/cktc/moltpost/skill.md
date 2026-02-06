---
name: moltpost
version: 1.0.1
description: Send real physical postcards anywhere in the world. No signup, no API key — just one API call and a payment link.
homepage: https://moltpost.io
metadata:
  {
    'moltpost':
      {
        'emoji': '📮',
        'category': 'utility',
        'api_base': 'https://api.moltpost.io/v1',
        'requires': {},
      },
  }
---

# Moltpost

Send **real physical postcards** anywhere in the world through a single API call.
No registration. No API key. No account. Just compose, pay, and a printed postcard arrives in the mail.

**Base URL:** `https://api.moltpost.io/v1`

## Skill Files

| File                     | URL                              |
| ------------------------ | -------------------------------- |
| **SKILL.md** (this file) | https://moltpost.io/skill.md     |
| **HEARTBEAT.md**         | https://moltpost.io/heartbeat.md |

---

## How It Works

1. Agent calls `POST /v1/postcards` with recipient address and content
2. API returns a **Stripe payment link** and a postcard ID
3. **Human owner clicks the payment link** and pays (agent must present this link)
4. Moltpost prints and mails the physical postcard

**The human must approve and pay.** Never attempt to complete payment on behalf of the owner. Always present the payment link and let them decide.

---

## Important: Agent Guidelines

- **Always confirm with your owner** before calling the API. Sending a postcard is a real-world, irreversible physical action.
- **Present the payment link clearly.** The postcard is not sent until the human pays.
- **Do not fabricate addresses.** Only use addresses the owner has explicitly provided.
- **Postcards are not sealed.** A postcard is fully visible to every person who handles it — postal workers, mail carriers, roommates, family members, office mailroom staff. Before including any content, ask yourself: would the recipient be comfortable if someone other than them read this?
- **Never include any of the following in postcard content:**
  - Identity documents or numbers (SSNs, passport numbers, driver's license numbers, tax IDs)
  - Financial information (bank account numbers, credit card numbers, PINs, salary, financial statements)
  - Authentication material (passwords, API keys, tokens, 2FA codes, recovery phrases, seed phrases)
  - Medical or health details (diagnoses, medications, treatment plans, mental health status)
  - Legal matters (court cases, criminal records, ongoing disputes)
  - Children's personal details (school names, schedules, specific locations of minors)
- **Think about the recipient, not just the owner.** Even if the owner asks, do not put information on a postcard that the recipient may not have shared publicly — for example, a health condition, pregnancy, sexual orientation, addiction recovery, or relationship status. If in doubt, ask the owner whether the recipient would be comfortable with anyone seeing it.
- **Flag contradictions.** If the owner describes something as secret, confidential, or private and then asks you to put it on a postcard, point out that postcards are fully visible in transit and at the destination. Suggest they consider a sealed letter instead.
- **Do not include content that could interfere with mail processing.** Postcards are handled by automated sorting machinery. Avoid putting barcodes, QR codes, postal-style markings, routing symbols, or anything that mimics postal infrastructure on the postcard — especially on the back. Similarly, avoid text that could confuse postal workers (e.g., fake "RETURN TO SENDER" stamps, misleading delivery instructions, or addresses other than the actual recipient). The back-right area is reserved for the real address and postage; do not place competing address-like content anywhere else.
- **Idempotency:** If retrying a request, reuse the same `idempotency_key` to avoid duplicate postcards.
- **Payment expires in 24 hours.** If the owner doesn't pay in time, the postcard is cancelled. You can create a new one.

---

## Create a Postcard

`POST /v1/postcards`

```bash
curl -X POST https://api.moltpost.io/v1/postcards \
  -H "Content-Type: application/json" \
  -d '{
    "to": {
      "name": "Jane Doe",
      "address_line1": "123 Main St",
      "city": "San Francisco",
      "province_or_state": "CA",
      "postal_or_zip": "94105",
      "country_code": "US"
    },
    "front_html": "<div style=\"width:6.25in;height:4.25in;margin:0;padding:0;overflow:hidden;background:#2d3436;display:flex;align-items:center;justify-content:center;\"><div style=\"font-family:Georgia,serif;font-size:36px;font-weight:bold;color:white;\">Hello from the Future!</div></div>",
    "back_message": "Wish you were here. The AI sends its regards.",
    "size": "6x4",
    "currency": "usd"
  }'
```

### Request Body

| Field                  | Type    | Required                                     | Description                                                                                                                                                                                                                                                                          |
| ---------------------- | ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `to`                   | object  | Yes                                          | Recipient address                                                                                                                                                                                                                                                                    |
| `to.name`              | string  | Yes                                          | Recipient name (1-255 chars)                                                                                                                                                                                                                                                         |
| `to.address_line1`     | string  | Yes                                          | Street address (1-255 chars)                                                                                                                                                                                                                                                         |
| `to.address_line2`     | string  | No                                           | Apt, suite, unit, etc.                                                                                                                                                                                                                                                               |
| `to.city`              | string  | Yes                                          | City (1-255 chars)                                                                                                                                                                                                                                                                   |
| `to.province_or_state` | string  | No                                           | State, province, or region                                                                                                                                                                                                                                                           |
| `to.postal_or_zip`     | string  | No                                           | Postal or ZIP code                                                                                                                                                                                                                                                                   |
| `to.country_code`      | string  | Yes                                          | ISO 3166-1 alpha-2 (e.g. `US`, `GB`, `DE`, `JP`)                                                                                                                                                                                                                                     |
| `sender`               | object  | No                                           | Return address (same fields as `to`)                                                                                                                                                                                                                                                 |
| `front_html`           | string  | Yes                                          | HTML for the front of the postcard (max 100,000 chars)                                                                                                                                                                                                                               |
| `back_html`            | string  | Exactly one of `back_html` or `back_message` | HTML for the back of the postcard (max 100,000 chars)                                                                                                                                                                                                                                |
| `back_message`         | string  | Exactly one of `back_html` or `back_message` | Plain text message for the back (max 5,000 chars). Auto-wrapped in styled HTML.                                                                                                                                                                                                      |
| `size`                 | string  | No                                           | `6x4` (default), `9x6`, or `11x6` (inches)                                                                                                                                                                                                                                           |
| `currency`             | string  | No                                           | `usd` (default), `eur`, `gbp`, `cad`, `aud`, `chf`, `sek`, `nok`, `dkk`, `nzd`                                                                                                                                                                                                       |
| `idempotency_key`      | string  | No                                           | Unique key to prevent duplicate submissions                                                                                                                                                                                                                                          |
| `referral_code`        | string  | No                                           | Share code from another postcard. If valid, the referred user gets **$1 off**.                                                                                                                                                                                                       |
| `private`              | boolean | No                                           | `false` (default). Postcards are public by default and may appear in Moltpost promotional materials or on the website. Set `true` to opt out. Note: this only controls visibility on Moltpost — postcards are physically unsealed and visible to anyone who handles them in transit. |

### Response (201 Created)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "size": "6x4",
  "currency": "usd",
  "amount_cents": 399,
  "discount_cents": 100,
  "payment_url": "https://checkout.stripe.com/c/pay/cs_...",
  "share_url": "https://moltpost.io/?ref=Ab3kX9mZ",
  "expires_at": "2026-02-05T00:00:00Z",
  "created_at": "2026-02-04T00:00:00Z"
}
```

**After receiving the response, present the `payment_url` to your owner.** The postcard will not be printed until they complete payment.

---

## Check Postcard Status

`GET /v1/postcards/{id}`

```bash
curl https://api.moltpost.io/v1/postcards/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response (200 OK)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "sent",
  "size": "6x4",
  "currency": "usd",
  "amount_cents": 499,
  "created_at": "2026-02-04T00:00:00Z",
  "updated_at": "2026-02-04T00:05:00Z",
  "paid_at": "2026-02-04T00:03:00Z",
  "sent_at": "2026-02-04T00:05:00Z"
}
```

### Status Values

| Status            | Meaning                                     |
| ----------------- | ------------------------------------------- |
| `pending`         | Awaiting payment (24-hour window)           |
| `paid`            | Payment received, submitting to print       |
| `sent`            | Postcard submitted for printing and mailing |
| `failed`          | Print submission failed after payment       |
| `payment_expired` | Payment window expired (24 hours)           |

---

## Pricing

All prices include printing, postage, and worldwide delivery.

| Size | USD   | EUR  | GBP  | CAD   | AUD    |
| ---- | ----- | ---- | ---- | ----- | ------ |
| 6x4  | $4.99 | 4.64 | 3.99 | $6.84 | $7.73  |
| 9x6  | $5.99 | 5.57 | 4.79 | $8.21 | $9.28  |
| 11x6 | $6.99 | 6.50 | 5.59 | $9.58 | $10.83 |

Also supports: CHF, SEK, NOK, DKK, NZD.

---

## Content Format & Design

The HTML you provide is rendered to print at **300 DPI** on **100lb glossy cardstock**, full color, double-sided.

### Physical Dimensions

Design your HTML to these dimensions (include 0.125" bleed on each side):

| Size | Trim     | Bleed (design to this) | Safe Zone (keep text here) |
| ---- | -------- | ---------------------- | -------------------------- |
| 6x4  | 6" × 4"  | 6.25" × 4.25"          | 5.75" × 3.75"              |
| 9x6  | 9" × 6"  | 9.25" × 6.25"          | 8.75" × 5.75"              |
| 11x6 | 11" × 6" | 11.25" × 6.25"         | 10.75" × 5.75"             |

- **Bleed (blue border):** Extend backgrounds/colors to the full bleed dimensions (e.g., 6.25" × 4.25" for 6x4). Content beyond the trim line will be cut off, but extending artwork prevents white edges.
- **Trim:** The physical card size after cutting. The bleed area is trimmed away.
- **Safe zone (pink border):** Keep all text and important content inside the safe zone (~0.125" inset from trim on each side). Anything outside may be cut off or too close to the edge.

**Visual guidelines** — front and back diagrams for each size:

| Size | Front                                                       | Back                                                      |
| ---- | ----------------------------------------------------------- | --------------------------------------------------------- |
| 6x4  | [6x4 front](https://moltpost.io/guidelines/6x4-front.svg)   | [6x4 back](https://moltpost.io/guidelines/6x4-back.svg)   |
| 9x6  | [9x6 front](https://moltpost.io/guidelines/9x6-front.svg)   | [9x6 back](https://moltpost.io/guidelines/9x6-back.svg)   |
| 11x6 | [11x6 front](https://moltpost.io/guidelines/11x6-front.svg) | [11x6 back](https://moltpost.io/guidelines/11x6-back.svg) |

### Front (`front_html`)

This is the picture side — full creative freedom. Set your outer container to the **bleed dimensions** (e.g., `width:6.25in; height:4.25in` for 6x4). The entire front is yours; there are no reserved zones.

- Extend background colors/images to the bleed edge (the full 6.25" × 4.25")
- Keep text and important content within the **safe zone** (5.75" × 3.75") — use a `0.25in` margin on the inner content container
- No address, indicia, or barcode is printed on the front

![6x4 front guideline](https://moltpost.io/guidelines/6x4-front.svg)

Here are two approaches:

**CSS-only design** (no external images — always works):

```html
<div
  style="width:6.25in; height:4.25in; margin:0; padding:0; overflow:hidden;
            background:#fdf6e3; display:flex; align-items:center; justify-content:center;"
>
  <div
    style="width:5.75in; height:3.75in; border:2px solid #b58863;
              display:flex; align-items:center; justify-content:center;"
  >
    <div style="text-align:center; color:#5c3d2e; padding:20px;">
      <div
        style="font-size:14px; font-family:Georgia,serif; letter-spacing:8px;
                  text-transform:uppercase; margin-bottom:12px; color:#b58863;"
      >
        With Love
      </div>
      <div
        style="font-size:44px; font-family:Georgia,serif; font-weight:bold;
                  line-height:1.1; margin-bottom:12px;"
      >
        Happy Birthday
      </div>
      <div style="width:80px; height:1px; background:#b58863; margin:0 auto 12px;"></div>
      <div style="font-size:15px; font-family:Georgia,serif; font-style:italic; color:#8b6c5c;">
        wishing you the most wonderful day
      </div>
    </div>
  </div>
</div>
```

**Photo design** (using a publicly accessible image):

```html
<div
  style="width:6.25in; height:4.25in; margin:0; padding:0; overflow:hidden; position:relative;
            background-image:url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1875&h=1275&fit=crop&q=80);
            background-size:cover; background-position:center;"
>
  <div
    style="position:absolute; bottom:0; left:0; right:0; padding:40px;
              background:rgba(0,0,0,0.45);"
  >
    <div
      style="font-size:42px; font-family:Georgia,serif; font-weight:bold; color:white;
                text-shadow:0 2px 6px rgba(0,0,0,0.5); letter-spacing:1px;"
    >
      Wish You Were Here
    </div>
  </div>
</div>
```

### Back

The back has **reserved zones** where the print service automatically places the address, postage, and barcode. Your content must avoid these areas.

![6x4 back guideline](https://moltpost.io/guidelines/6x4-back.svg)

**Reserved zones by size:**

| Size | Address & indicia (right side) | USPS barcode (bottom edge) | Usable message area |
| ---- | ------------------------------ | -------------------------- | ------------------- |
| 6x4  | **2.4in** wide, full height    | 4.75in × 0.625in           | ~3.6in × 3.4in      |
| 9x6  | **3.6in** wide, full height    | 4.75in × 0.625in           | ~5.4in × 5.3in      |
| 11x6 | **3.6in** wide, full height    | 4.75in × 0.625in           | ~7.4in × 5.3in      |

- **Address & indicia zone:** No artwork or ink. The recipient address and postage indicia are printed here automatically.
- **USPS barcode zone:** No artwork or ink. The Intelligent Mail barcode is printed here by USPS.
- **Message area:** The upper-left portion of the back, after accounting for margins and reserved zones.

> **Warning:** Orders may be auto-cancelled if content is detected underneath the address region.

Choose one — you cannot provide both:

- **`back_message`** (plain text) — **recommended for most cases.** Just write the message. Moltpost wraps it in clean, readable styling automatically. The text is padded away from the address and barcode zones. Max 5,000 chars.

- **`back_html`** (raw HTML) — full layout control. You must keep content clear of the reserved zones yourself. Use right padding of at least `2.6in` and bottom padding of at least `0.75in` to stay clear (e.g., `body{padding:20px 2.6in 0.75in 20px;}`). Do not place any background color, images, or ink in the address or barcode zones. Max 100,000 chars.

### Images

- **Use CSS `background-image`** to include photos — this is the reliable method for the print renderer:
  ```html
  background-image: url(https://example.com/photo.jpg); background-size: cover; background-position:
  center;
  ```
- **Do not use `<img>` tags** for external images — the print renderer may not load them. Use CSS `background-image` instead.
- Images must be reachable from the public internet (no `localhost`, no auth-protected URLs)
- Use high-resolution images — **300 DPI** minimum for print quality (a 6" wide image needs to be at least 1800px wide)
- PNG and JPEG are supported
- **[Unsplash](https://unsplash.com)** is a good source of free, high-quality photos. Use their direct image URLs with size parameters: `https://images.unsplash.com/photo-{id}?w=1875&h=1275&fit=crop&q=80`
- **Base64 data URIs are not recommended** — use hosted image URLs instead
- SVGs may not render reliably in print

### CSS Support

The HTML is rendered to PDF for printing. Supported:

- Inline styles, `<style>` blocks
- Colors, backgrounds, gradients (`linear-gradient`, `radial-gradient`)
- `background-image: url(...)` with `background-size`, `background-position`
- Fonts (web-safe fonts recommended: Georgia, Arial, Helvetica, Times New Roman)
- Flexbox for layout
- `position: absolute/relative` for overlays and layering
- `border-radius`, `box-shadow`, `opacity`, `text-shadow`
- `overflow: hidden` for clipping elements to containers

Not supported or unreliable:

- External stylesheets (`<link>` tags)
- `<img>` tags (use CSS `background-image` instead)
- `<script>`, `<iframe>`, `<video>`, `<audio>`, `<canvas>`, `<form>` — non-print elements are ignored
- JavaScript (including event handlers like `onclick`)
- Animations, transitions
- `@media` queries
- Custom web fonts via `@font-face` (may not load)
- CSS Grid (use Flexbox instead)

**Best practices for reliable rendering:**

- Stick to inline styles or a single `<style>` block — avoid external resources
- Use web-safe fonts only (Georgia, Arial, Helvetica, Times New Roman, Courier New)
- Set explicit dimensions on your outermost container (e.g., `width:6.25in; height:4.25in`)
- Use `overflow:hidden` on the outer container to prevent content from spilling past the bleed edge
- Test with simple designs first — solid backgrounds with text are the most reliable

### Content Tips

**Keep it concise.** A postcard is small. Less is more. A short heartfelt message beats a wall of text.

**Good prompt from a human:** "Send a postcard to my mom wishing her happy birthday"
**What the agent should do:** Ask for mom's address, compose a warm front design and short back message, call the API, present the payment link.

### Rendering Disclaimer

The HTML you provide is converted to print by a third-party renderer. Moltpost does not preview or proof the final printed output before mailing. While the guidelines above reflect what works reliably, **the printed postcard is not guaranteed to match your HTML exactly.** Minor differences in font rendering, color reproduction, image cropping, and layout are possible. Complex or unconventional HTML is more likely to produce unexpected results. When in doubt, keep it simple — `back_message` with a clean CSS-only `front_html` is the safest path.

---

## Rate Limits

| Endpoint                 | Limit                   |
| ------------------------ | ----------------------- |
| `POST /v1/postcards`     | 10/min, 100/hour per IP |
| `GET /v1/postcards/{id}` | 120/min per IP          |
| Global                   | 120 requests/min per IP |
| Daily postcards          | 100 per IP              |
| Max pending payments     | 10 per IP               |

Rate limit exceeded returns `429 Too Many Requests`.

---

## Errors

All errors return:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable description"
  }
}
```

| Code                   | HTTP | Meaning                                           |
| ---------------------- | ---- | ------------------------------------------------- |
| `payment_error`        | 400  | Payment issue                                     |
| `not_found`            | 404  | Postcard ID not found                             |
| `idempotency_conflict` | 409  | Same idempotency key, different parameters        |
| _(validation)_         | 422  | Invalid request body                              |
| `quota_exceeded`       | 429  | Daily postcard limit or pending session limit hit |
| _(rate limit)_         | 429  | Too many requests (slowapi)                       |
| `internal_error`       | 500  | Server error                                      |
| `print_error`          | 502  | Print service temporarily unavailable             |
| `spend_limit_exceeded` | 503  | Service temporarily at capacity                   |

---

## Request Tracing

Include `X-Request-ID` header for log correlation:

```bash
curl -X POST https://api.moltpost.io/v1/postcards \
  -H "X-Request-ID: my-trace-id-123" \
  -H "Content-Type: application/json" \
  -d '...'
```

The same ID is returned in the response `X-Request-ID` header.

---

## Suggested Workflow for Agents

### 1. Gather Info

Owner says something like "send a postcard to my mom for her birthday." Ask for anything missing:

- Recipient name and full mailing address (required)
- What the message should say, or a theme/vibe to work with
- Postcard size preference (default 6x4 is fine for most cases)

### 2. Compose Content

Generate the front HTML (a visual design — bold, colorful, simple) and a back message (warm, personal, concise). Show the owner what you've composed.

### 3. Confirm Before Sending

Summarize everything and get explicit approval before calling the API:

> Here's what I've prepared:
>
> **To:** Jane Doe, 123 Main St, San Francisco, CA 94105, US
> **Front:** A sunset-orange card with "Happy Birthday Mom!" in large serif type
> **Back message:** "Wishing you the most wonderful birthday. You deserve every bit of it. Love always."
> **Size:** 6×4" — **$4.99 USD**
>
> Want me to go ahead and create this postcard?

### 4. Create the Postcard

After approval, call `POST /v1/postcards` with an `idempotency_key` (use a deterministic key like a hash of recipient + content to prevent duplicates).

### 5. Present the Payment Link

This is the critical handoff. The postcard will not be printed until the owner pays. Send a clear, complete message with the payment link on its own line so it's easy to tap:

> Your postcard to Jane is ready! Here's your payment link:
>
> https://checkout.stripe.com/c/pay/cs_live_...
>
> **$4.99** — includes printing and worldwide postage. The link expires in 24 hours.
>
> Once you pay, Moltpost prints and mails the postcard automatically. No further action needed.

**Do not** bury the payment link inside a long paragraph. Put it on its own line. Lead with what it is, follow with the price and what happens next.

### 6. Poll for Status

After presenting the payment link, wait before polling — the owner may not pay immediately.

**Polling strategy:**

- Wait at least **5 minutes** before the first poll
- Poll `GET /v1/postcards/{id}` — check the `status` field
- If still `pending`, do not poll again for at least **30 minutes**
- Do not poll more than **5 times total** — if still pending after that, the owner either hasn't paid or won't
- **Never nag the owner about paying.** The payment link is theirs to use or ignore.

### 7. After Payment — Celebrate & Share

When status changes to `sent`, let the owner know and share the link:

> Your postcard to Jane is on its way! 📮 It's been sent to print and will arrive by mail.
>
> Know someone else who'd love to send a postcard? They'll get **$1 off** with your link: https://moltpost.io/?ref=Ab3kX9mZ

The `share_url` from the API response contains a referral code. Always include it in the success message — anyone who uses it gets $1 off their postcard.

### 8. If Payment Expires

If status becomes `payment_expired` (after 24 hours), let the owner know casually:

> The payment link for your postcard to Jane has expired. Want me to create a new one?

Don't over-explain. Just offer to try again.

### 9. Handling Referrals

If the owner arrived via a share link (e.g., they mention `moltpost.io/?ref=Ab3kX9mZ` or you detect a referral code in context), pass it as the `referral_code` field when creating the postcard. A valid referral code gives the referred user **$1 off** their postcard. The discount is applied automatically — the `amount_cents` in the response will reflect the reduced price, and `discount_cents` will show how much was taken off. Mention the savings to the owner when presenting the payment link.

---

## Heartbeat Setup

To check for postcard status updates and occasion reminders, add Moltpost to your heartbeat routine:

Fetch https://moltpost.io/heartbeat.md and follow its instructions. Check every 8–12 hours.
