# Validation Patterns for AGIRAILS

Common validation patterns for different service types.

---

## 🎯 Lead Validation

```typescript
interface Lead {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  source?: string;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  score?: number;
}

async function validateLead(lead: Lead): Promise<ValidationResult> {
  // 1. Required fields
  if (!lead.email) {
    return { valid: false, reason: 'Missing email' };
  }

  // 2. Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lead.email)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  // 3. Not a disposable email
  const disposableDomains = ['tempmail.com', 'throwaway.com', '10minutemail.com'];
  const domain = lead.email.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: 'Disposable email' };
  }

  // 4. Not a duplicate (check your DB)
  if (await existsInDatabase(lead.email)) {
    return { valid: false, reason: 'Duplicate lead' };
  }

  // 5. Company verification (optional)
  if (lead.company) {
    const companyExists = await verifyCompany(lead.company);
    if (!companyExists) {
      return { valid: false, reason: 'Company not found' };
    }
  }

  // 6. Calculate quality score
  let score = 0.5;
  if (lead.name) score += 0.1;
  if (lead.company) score += 0.2;
  if (lead.phone) score += 0.1;
  if (isBusinessEmail(lead.email)) score += 0.1;

  return { valid: true, score };
}

function isBusinessEmail(email: string): boolean {
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = email.split('@')[1];
  return !personalDomains.includes(domain);
}
```

---

## 📝 Content Validation

```typescript
interface ContentDelivery {
  text: string;
  wordCount?: number;
  format?: string;
}

interface ContentRequest {
  type: 'article' | 'summary' | 'translation';
  minWords?: number;
  maxWords?: number;
  language?: string;
  keywords?: string[];
}

async function validateContent(
  delivery: ContentDelivery, 
  request: ContentRequest
): Promise<ValidationResult> {
  const text = delivery.text.trim();

  // 1. Not empty
  if (!text) {
    return { valid: false, reason: 'Empty content' };
  }

  // 2. Word count
  const wordCount = text.split(/\s+/).length;
  
  if (request.minWords && wordCount < request.minWords) {
    return { 
      valid: false, 
      reason: `Too short: ${wordCount} words, need ${request.minWords}` 
    };
  }

  if (request.maxWords && wordCount > request.maxWords) {
    return { 
      valid: false, 
      reason: `Too long: ${wordCount} words, max ${request.maxWords}` 
    };
  }

  // 3. Language check (if specified)
  if (request.language) {
    const detectedLang = await detectLanguage(text);
    if (detectedLang !== request.language) {
      return { 
        valid: false, 
        reason: `Wrong language: expected ${request.language}, got ${detectedLang}` 
      };
    }
  }

  // 4. Keywords present (if specified)
  if (request.keywords && request.keywords.length > 0) {
    const textLower = text.toLowerCase();
    const missingKeywords = request.keywords.filter(
      kw => !textLower.includes(kw.toLowerCase())
    );
    if (missingKeywords.length > 0) {
      return { 
        valid: false, 
        reason: `Missing keywords: ${missingKeywords.join(', ')}` 
      };
    }
  }

  // 5. Quality score (optional: use LLM)
  const qualityScore = await evaluateQualityWithLLM(text, request);

  return { valid: true, score: qualityScore };
}
```

---

## 🔄 Translation Validation

```typescript
interface TranslationDelivery {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

async function validateTranslation(
  delivery: TranslationDelivery
): Promise<ValidationResult> {
  const { originalText, translatedText, sourceLanguage, targetLanguage } = delivery;

  // 1. Not empty
  if (!translatedText.trim()) {
    return { valid: false, reason: 'Empty translation' };
  }

  // 2. Not same as original (unless languages are similar)
  if (translatedText === originalText && sourceLanguage !== targetLanguage) {
    return { valid: false, reason: 'Translation unchanged from original' };
  }

  // 3. Verify target language
  const detectedLang = await detectLanguage(translatedText);
  if (detectedLang !== targetLanguage) {
    return { 
      valid: false, 
      reason: `Wrong language: expected ${targetLanguage}, got ${detectedLang}` 
    };
  }

  // 4. Length sanity check (translations shouldn't be wildly different)
  const ratio = translatedText.length / originalText.length;
  if (ratio < 0.5 || ratio > 2.0) {
    return { 
      valid: false, 
      reason: `Suspicious length ratio: ${ratio.toFixed(2)}` 
    };
  }

  // 5. Back-translation check (optional, expensive)
  // Translate back and compare semantic similarity

  return { valid: true, score: 0.9 };
}
```

---

## 🧮 Generic Validation Helper

```typescript
async function validateDelivery(
  delivery: any,
  request: any,
  validators: Array<(d: any, r: any) => Promise<ValidationResult>>
): Promise<ValidationResult> {
  for (const validator of validators) {
    const result = await validator(delivery, request);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

// Usage:
const result = await validateDelivery(delivery, request, [
  validateNotEmpty,
  validateFormat,
  validateQuality,
  validateNoDuplicates,
]);
```

---

## 🚨 Dispute Criteria

When to dispute (return invalid):

| Severity | Action |
|----------|--------|
| Empty delivery | Dispute immediately |
| Wrong format | Dispute |
| Partial delivery (<50%) | Dispute |
| Wrong language | Dispute |
| Low quality (<50% score) | Consider dispute |
| Minor issues | Accept, note for future |

---

## 💡 Tips

1. **Be fair** - minor issues shouldn't trigger disputes
2. **Document everything** - keep evidence for mediation
3. **Set clear expectations** - in the service description
4. **Use scoring** - not just pass/fail
5. **Consider partial acceptance** - negotiate before disputing
