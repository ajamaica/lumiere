# Gmail Filters - 2026-02-04 Security Scan

## CRITICAL FILTERS TO CREATE IMMEDIATELY

### Filter 1: Block 199trust@gmail.com Phishing Ring

**Setup in Gmail:**

1. Go to Settings → Filters and Blocked Addresses
2. Create new filter
3. From: `199trust@gmail.com`
4. Action: Delete (auto-delete to trash)
5. Apply to all matching conversations

**Reason:** Active QR code phishing campaign targeting your trust document service with 97+ emails already received.

---

### Filter 2: Block QR Code + Trust Keywords

**Setup in Gmail:**

1. Go to Settings → Filters and Blocked Addresses
2. Create new filter
3. Subject/Body: `(QR code OR QR Code) (trust OR Trust) -verify` (negative match on "verify" to avoid false positives)
4. Action: Delete or Archive
5. Apply to all matching conversations

**Reason:** Catch similar phishing attempts using QR codes as obfuscation technique

---

### Filter 3: Block "Secure QR Code is Ready" Exact Match

**Setup in Gmail:**

1. Go to Settings → Filters and Blocked Addresses
2. Create new filter
3. Subject: `Secure QR Code is Ready`
4. Action: Delete
5. Apply to all matching conversations

**Reason:** Exact pattern from active phishing campaign

---

## OPTIONAL: Promotional Email Unsubscribes

Can safely unsubscribe from (low priority, already spam-filtered but still arriving):

- `news@magic.twentytwowords.com` (22 Words)
- `alert@grassrootsaction.com` (Grassfire political alerts)
- `kim@insanelygoodrecipes.com` (Insanely Good recipes)
- `no-reply+6805cb3b@toast-restaurants.com` (Flappers Comedy)
- `newsletter@xda-developers.com` (XDA Developers tech news)

---

## IMPORTANT: DO NOT FILTER

These are important legitimate account alerts - KEEP:

- `noreply@linode.com` (Linode infrastructure alerts)
- `noreply@tm.openai.com` (OpenAI account alerts)
- `noreply@github.com` (GitHub security alerts)
- `alerts@account.chime.com` (Bank account alerts)
- `support@ionos.com` (Domain admin alerts)
- `no-reply@accounts.google.com` (Google Security alerts)

---

## Security Action Items

1. ✅ Scanned inbox for phishing (97 found)
2. ⏳ Create the 3 critical filters above
3. 🔍 Check 199trust@gmail.com account for unauthorized access
4. 📋 Review access logs for your trust document service
5. 📧 Consider notifying affected customers of phishing attempt
6. 🚨 Monitor for similar QR-based phishing attacks

Last scanned: 2026-02-04 10:10 AM
Next recommendation: Weekly filter review until threat subsides
