---
name: lead-gen-website
description: Build complete local lead generation websites with SEO optimization, conversion tracking, and RGPD compliance. Use for creating service-based websites targeting local markets (plumbers, electricians, home services, etc.) with 10-20 pages, structured data, analytics, and legal compliance.
---

# Lead Generation Website Builder

Build conversion-optimized local service websites with complete SEO, tracking, and RGPD compliance — **avec garde-fous anti-spam (Google Spam Policies + March 2024)**, local SEO (GBP) et micro-budget ads.

## When to Use This Skill

Use this skill when the user requests a website for:

- Local service businesses (home services, repairs, professional services)
- Lead generation focused on specific geographic areas
- Sites requiring 10-20+ pages with service pages, blog, and legal pages
- SEO-optimized content targeting local keywords
- Conversion tracking (phone, WhatsApp, forms with UTM parameters)
- RGPD/GDPR compliance (cookie banner, privacy policy, legal pages)

## Workflow Overview

Follow these phases sequentially. Do NOT skip phases or combine them without clear reason.

0. **Policy / Risk Check (mandatory)**

- Read `references/google-spam-guardrails-2024.md`
- Explicitly verify: no doorway pages, no scaled generic content, no fake address/avis, no misleading claims.
- If the project is **mise en relation** (leadgen): require clear disclosure on all key pages.

Then continue with Phases 1→7.

### Phase 1: Analysis and Planning

Gather project requirements from the user or specifications document.

**Required information:**

- Business niche and services offered
- Geographic target area (city + radius)
- Target keywords for SEO
- Contact information (phone, WhatsApp, email)
- Number and types of pages needed
- Competitor websites (for differentiation)

**Output:** Clear understanding of project scope, target audience, and conversion goals.

### Phase 2: Design Brainstorming

Create `ideas.md` in the project root with THREE distinct design approaches.

Use `templates/design-ideas-template.md` as structure. Each approach must define:

- Design movement and aesthetic philosophy
- Color palette with hex codes and emotional intent
- Typography system (headings + body fonts)
- Layout paradigm (avoid generic centered layouts)
- Signature visual elements
- Animation guidelines
- Interaction philosophy

Consult `references/design-philosophies.md` for inspiration, but create original combinations.

**Selection:** Choose ONE approach and document the rationale. This design philosophy will guide ALL subsequent design decisions.

### Phase 3: Visual Assets Generation

Generate 3-5 high-quality images using `generate` tool. These images MUST:

- Align with the chosen design philosophy (colors, mood, style)
- Be stored in `/home/ubuntu/webdev-static-assets/`
- Cover key visual needs: hero background, service illustrations, local landmarks, team/artisan photos

Plan strategic usage:

- Hero section: Most impactful image
- Service pages: Relevant illustrations
- About/Trust sections: Team or local landmark photos

Do NOT generate images on-the-fly during development. Generate all at once for efficiency.

### Phase 4: Content Structure

Create detailed content structure for all pages.

**Option A (Manual):** Write `content-structure.md` directly with sections for each page including title, meta description, H1, and main content outline.

**Option B (Script):** Create `specs.json` with page data, then run:

```bash
python /home/ubuntu/skills/lead-gen-website/scripts/generate_content_structure.py specs.json content-structure.md
```

**Content requirements:**

- Minimum 500 words per main page (homepage, main services)
- Minimum 1000 words per blog article
- Include target keywords naturally (no stuffing)
- Answer user intent (what, why, how, cost, area)
- Local focus (mention city/region frequently)

### Phase 5: Development

Initialize project and build all pages.

#### 5.1 Initialize Project

```bash
webdev_init_project <project-name>
```

#### 5.2 Configure Design Tokens

Edit `client/src/index.css` with chosen design philosophy:

- Update CSS variables for colors (primary, secondary, accent, background, foreground)
- Configure typography (font-family for sans, serif)
- Adjust shadows, radius, animations

Add Google Fonts in `client/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;600;700&display=swap"
  rel="stylesheet"
/>
```

#### 5.3 Create Reusable Components

Use templates from `templates/` directory. Replace placeholders with project-specific values:

**Header** (`templates/component-Header.tsx`):

- `{{SITE_NAME}}`, `{{SITE_TAGLINE}}`, `{{SITE_INITIALS}}`
- `{{PHONE_NUMBER}}`, `{{WHATSAPP_NUMBER}}`
- `{{NAV_ITEMS}}` (JSON array of `{label, href}`)

**Footer** (`templates/component-Footer.tsx`):

- `{{SITE_NAME}}`, `{{SITE_DESCRIPTION}}`
- `{{SERVICE_LINKS}}`, `{{UTILITY_LINKS}}`
- `{{PHONE_NUMBER}}`, `{{EMAIL}}`, `{{LOCATION}}`

**SEOHead** (`templates/component-SEOHead.tsx`):

- Replace `{{DOMAIN}}` with actual domain

**Other components:** Breadcrumbs, ContactForm, CookieBanner (copy as-is, minimal customization needed)

#### 5.4 Build Pages

**For similar pages (services, blog articles):**

1. Create template file (e.g., `service-template.tsx`) using `templates/page-service-template.tsx`
2. Create data file (e.g., `services-data.json`) with array of page data
3. Run batch generation:

```bash
python /home/ubuntu/skills/lead-gen-website/scripts/generate_pages_batch.py service-template.tsx services-data.json client/src/pages/
```

**For unique pages (homepage, tarifs, FAQ, contact):**
Build manually with rich, custom content. Use components for consistency.

**For legal pages:**
Use `templates/page-legal-template.tsx` with standard legal content.

#### 5.5 Update App.tsx

Add all routes to `client/src/App.tsx`:

```tsx
<Route path="/service-page" component={ServicePage} />
```

Integrate Header, Footer, and CookieBanner in App layout.

### Phase 6: SEO, Tracking, GBP, Ads

#### 6.1 Generate SEO Files

Create `pages.json` with all URLs and priorities:

```json
[
  { "url": "/", "priority": "1.0" },
  { "url": "/service", "priority": "0.9" },
  { "url": "/contact", "priority": "0.9" },
  { "url": "/blog", "priority": "0.6" },
  { "url": "/mentions-legales", "priority": "0.3" }
]
```

Run script:

```bash
python /home/ubuntu/skills/lead-gen-website/scripts/create_seo_files.py yourdomain.com pages.json client/public/
```

This creates `robots.txt` and `sitemap.xml` in `client/public/`.

#### 6.2 Add Structured Data

Add JSON-LD structured data to key pages using SEOHead component's `jsonLd` prop:

**Homepage (LocalBusiness):**

```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Business Name',
  telephone: '+33123456789',
  email: 'contact@example.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'City',
    addressCountry: 'FR',
  },
  areaServed: ['City1', 'City2'],
  openingHours: 'Mo-Fr 08:00-18:00',
}
```

**Service pages (Service):**

```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Service Name',
  description: 'Service description',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Business Name',
  },
  areaServed: 'City',
}
```

Consult `references/seo-checklist.md` for complete SEO requirements.

#### 6.3 RGPD Compliance

Verify:

- CookieBanner component is integrated in App.tsx
- Privacy policy page exists with complete RGPD information
- Cookie policy page exists
- Legal mentions page exists
- ContactForm includes link to privacy policy

Consult `references/rgpd-compliance.md` for detailed requirements.

#### 6.4 GBP / Local SEO (Prominence)

Read and apply:

- `references/gbp-local-seo-playbook.md`

Deliverables to produce:

- GBP setup checklist (catégories/services/Q&R)
- 30-day photo/post/avis plan
- NAP citations list (quality-first, no spam)

#### 6.5 Micro-budget Ads (4€/jour)

Read and apply:

- `references/ads-micro-budget-4eur-playbook.md`

Deliverables to produce:

- 1 campagne ultra-serrée (keywords exact/phrase, zone, horaires, négatifs)
- 1 landing dédiée + tracking

#### 6.6 Conversion Tracking

ContactForm component automatically captures UTM parameters from URL:

- `utm_source` (e.g., google, facebook)
- `utm_campaign` (campaign name)
- `utm_adset` (ad set name)
- `utm_ad` (specific ad)

These are stored in form state and can be sent to backend/CRM for attribution tracking.

### Phase 7: Validation and Delivery

#### 7.1 Test in Browser

Open dev server URL and verify:

- All pages load without errors
- Navigation works (header menu, breadcrumbs)
- Forms submit correctly
- Mobile responsive (test sticky CTA buttons)
- Cookie banner appears on first visit
- Images load correctly

#### 7.2 SEO Validation

Verify against `references/seo-checklist.md`:

- Unique title and description on each page
- H1 hierarchy correct
- Images have alt attributes
- robots.txt and sitemap.xml accessible
- Structured data present on key pages

#### 7.3 Create Checkpoint

```bash
webdev_save_checkpoint "Complete lead-gen website - [X] pages, SEO optimized, RGPD compliant"
```

#### 7.4 Deliver to User

Send checkpoint attachment via `message` tool with:

- Summary of what was built
- Page count and key features
- SEO optimizations implemented
- Next steps (publish, custom domain, Google Search Console)

## Bundled Resources

### Scripts

**`scripts/generate_pages_batch.py`**
Generate multiple similar pages from template and data file.
Usage: `python generate_pages_batch.py <template> <data_json> <output_dir>`

**`scripts/create_seo_files.py`**
Generate robots.txt and sitemap.xml automatically.
Usage: `python create_seo_files.py <domain> <pages_json> <output_dir>`

**`scripts/generate_content_structure.py`**
Create content structure markdown from specifications JSON.
Usage: `python generate_content_structure.py <specs_json> <output_md>`

### Templates

**Components:**

- `component-Header.tsx` - Sticky header with logo, nav, CTA
- `component-Footer.tsx` - Footer with links and contact info
- `component-SEOHead.tsx` - SEO meta tags and structured data
- `component-Breadcrumbs.tsx` - Navigation breadcrumbs
- `component-ContactForm.tsx` - Form with UTM tracking
- `component-CookieBanner.tsx` - RGPD cookie consent banner

**Pages:**

- `page-service-template.tsx` - Service page template
- `page-legal-template.tsx` - Legal page template
- `design-ideas-template.md` - Design brainstorming structure

### References

**`references/seo-checklist.md`**
Complete SEO checklist covering meta tags, structured data, technical SEO, on-page SEO, local SEO, and content quality. Read this before Phase 6 to ensure nothing is missed.

**`references/conversion-best-practices.md`**
Best practices for maximizing conversions: CTA strategy, contact options, trust signals, form optimization, mobile optimization. Consult during Phase 5 when building pages.

**`references/rgpd-compliance.md`**
Complete RGPD compliance guide covering cookie banner, privacy policy, cookie policy, legal mentions, forms, consent, data security, and user rights. Essential for Phase 6.

**`references/design-philosophies.md`**
Five example design philosophies (Neo-Artisanat Digital, Brutalist Confidence, Soft Modernism, Vibrant Energy, Luxury Minimalism) with selection criteria. Use as inspiration during Phase 2.

## Tips and Best Practices

**Design consistency:** Document chosen design philosophy at the top of each CSS/component file as a reminder.

**Image optimization:** All images should be stored in `/home/ubuntu/webdev-static-assets/` and referenced via CDN URLs to avoid deployment timeouts.

**Content quality over quantity:** Better to have 10 excellent pages than 20 mediocre ones. Focus on answering user intent.

**Mobile-first:** Design and test mobile experience first. Most local service searches happen on mobile.

**Conversion priority:** Every page should have clear CTAs. Phone and WhatsApp buttons should be always visible on mobile.

**Local SEO:** Mention city/region name in titles, H1, and content. Create separate pages for each service area if covering multiple cities.

**Fast iteration:** Use batch generation scripts for similar pages to save time. Focus manual effort on unique, high-value pages.

**Testing:** Always test in browser before creating checkpoint. Check mobile responsive, form submission, and navigation.

## Common Pitfalls

**Skipping design brainstorming:** Leads to generic, forgettable designs. Always create ideas.md with 3 distinct approaches.

**Generating images during development:** Inefficient. Generate all images upfront in Phase 3.

**Weak content:** Thin content (<300 words) won't rank. Invest time in Phase 4 to create substantial, helpful content.

**Missing RGPD elements:** Cookie banner, privacy policy, and legal mentions are REQUIRED in EU. Don't skip Phase 6.3.

**No UTM tracking:** Without UTM parameters, you can't measure campaign effectiveness. Ensure ContactForm captures them.

**Forgetting mobile CTAs:** Desktop-only CTAs lose mobile conversions. Always add sticky mobile buttons.

**Creating checkpoint during development:** Only create ONE checkpoint at the end (Phase 7). Multiple checkpoints confuse users during initial delivery.
