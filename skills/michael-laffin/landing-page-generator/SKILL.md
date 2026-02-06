---
name: landing-page-generator
description: Generate high-converting landing pages for products, services, and lead generation. Use when creating marketing pages, product launches, squeeze pages, or digital asset sales pages.
---

# Landing Page Generator

## Overview

Generate high-converting landing pages with copy, structure, and HTML/CSS ready for deployment. Create marketing pages that convert visitors into customers.

## Core Capabilities

### 1. Page Templates

**Pre-built templates for:**

- Product launch pages (pre-launch and launch)
- Squeeze pages (email capture)
- Webinar registration pages
- Digital product sales pages (courses, ebooks, templates)
- Service booking pages
- Affiliate review pages
- Comparison pages (Product A vs Product B)
- Thank you/confirmation pages

### 2. Copywriting Frameworks

**Built with proven frameworks:**

- AIDA (Attention, Interest, Desire, Action)
- PAS (Problem, Agitation, Solution)
- Story-based hooks
- Social proof integration
- Objection handling
- Scarcity/urgency elements

### 3. SEO Optimization

**Automatically includes:**

- Optimized meta tags (title, description, keywords)
- Header tags (H1, H2, H3)
- Alt text for images
- Structured data (schema markup)
- Mobile-responsive design
- Fast loading structure

### 4. Conversion Elements

**Built-in conversion triggers:**

- Clear value propositions
- Benefit-oriented bullet points
- Testimonials/social proof
- FAQ sections
- Multiple CTAs (above and below fold)
- Guarantee/risk-reversal statements
- Countdown timers
- Limited-time offers

### 5. Responsive Design

**Optimized for:**

- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)
- Cross-browser compatibility

## Quick Start

### Generate Product Launch Page

```python
# Use scripts/generate_landing.py
python3 scripts/generate_landing.py \
  --type product-launch \
  --product "SEO Course" \
  --price 299 \
  --benefits "learn SEO,rank higher,get traffic" \
  --testimonials 3 \
  --cta "Enroll Now" \
  --output product_launch.html
```

### Generate Squeeze Page

```python
python3 scripts/generate_landing.py \
  --type squeeze \
  --headline "Get Free SEO Checklist" \
  --benefits "checklist,tips,strategies" \
  --cta "Send Me The Checklist" \
  --output squeeze.html
```

### Generate Affiliate Review Page

```python
python3 scripts/generate_landing.py \
  --type affiliate-review \
  --product "Software XYZ" \
  --affiliate-link "https://example.com/affiliate" \
  --pros 5 \
  --cons 2 \
  --cta "Try XYZ Now" \
  --output affiliate_review.html
```

## Scripts

### `generate_landing.py`

Generate landing page from parameters.

**Parameters:**

- `--type`: Page type (product-launch, squeeze, webinar, digital-product, service, affiliate-review, comparison, thank-you)
- `--headline`: Main headline
- `--subheadline`: Supporting subheadline
- `--product`: Product/service name
- `--price`: Price or "Starting at $X"
- `--benefits`: Comma-separated benefits
- `--features`: Comma-separated features
- `--testimonials`: Number of testimonials to include
- `--cta`: Call-to-action button text
- `--guarantee`: Guarantee text (optional)
- `--urgency`: Urgency message (optional)
- `--output`: Output file

**Example:**

```bash
python3 scripts/generate_landing.py \
  --type product-launch \
  --headline "Master SEO in 30 Days" \
  --subheadline "Complete course with live coaching" \
  --product "SEO Mastery Course" \
  --price 299 \
  --benefits "rank higher,drive traffic,boost sales" \
  --features "video lessons,templates,community" \
  --testimonials 5 \
  --cta "Enroll Now - Save 50% Today" \
  --guarantee "30-day money-back guarantee" \
  --urgency "Limited spots - Offer ends Friday" \
  --output landing.html
```

### `optimize_copy.py`

Optimize existing landing page copy.

**Parameters:**

- `--input`: Input HTML file
- `--framework`: Copywriting framework (AIDA, PAS, story)
- `--add-social-proof`: Add testimonial placeholders
- `--add-urgency`: Add scarcity elements
- `--output`: Optimized output

### `ab_test_variations.py`

Generate A/B testing variations.

**Parameters:**

- `--input`: Base landing page
- `--variations`: Number to generate (default: 3)
- `--test-elements`: What to test (headline, cta, price, colors)
- `--output-dir`: Output directory for variations

## Page Templates

### Product Launch Page Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[Product Name] - Transform Your Life</title>
    <meta name="description" content="..." />
    <!-- SEO meta tags -->
    <!-- Schema markup -->
  </head>
  <body>
    <!-- Hero Section -->
    <section class="hero">
      <h1>[Headline]</h1>
      <p>[Subheadline]</p>
      <a href="#pricing" class="cta">[CTA]</a>
    </section>

    <!-- Problem Section -->
    <section class="problem">
      <h2>Struggling with [Problem]?</h2>
      <p>You're not alone...</p>
    </section>

    <!-- Solution Section -->
    <section class="solution">
      <h2>Introducing [Product Name]</h2>
      <ul>
        [Benefits List]
      </ul>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2>What You'll Get</h2>
      <div class="feature-grid">[Feature 1] [Feature 2] [Feature 3]</div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials">
      <h2>What People Are Saying</h2>
      [Testimonial Cards]
    </section>

    <!-- Pricing Section -->
    <section class="pricing" id="pricing">
      <h2>Choose Your Plan</h2>
      [Pricing Cards]
    </section>

    <!-- Guarantee Section -->
    <section class="guarantee">
      <h2>[Guarantee]</h2>
      <p>[Risk-free language]</p>
    </section>

    <!-- FAQ Section -->
    <section class="faq">
      <h2>Frequently Asked Questions</h2>
      [FAQ Items]
    </section>

    <!-- Final CTA -->
    <section class="final-cta">
      <a href="#pricing" class="cta">[CTA]</a>
      <p>[Urgency message]</p>
    </section>

    <!-- Footer -->
    <footer>[Legal links, contact info]</footer>
  </body>
</html>
```

## Best Practices

### Headlines

- **Length:** 6-12 words maximum
- **Format:** Clear, benefit-driven
- **Punctuation:** Use numbers and brackets
- **Examples:**
  - "Master SEO in 30 Days"
  - "[Product Name]: The #1 Solution"
  - "How to [Benefit] Without [Pain]"

### CTAs

- **Positioning:** Above fold + multiple times below
- **Color:** High contrast (green, orange, blue)
- **Text:** Action-oriented (Enroll, Get, Start, Join)
- **Urgency:** Add time or scarcity

### Social Proof

- **Placement:** Near CTA sections
- **Variety:** Mix of reviews, case studies, stats
- **Specificity:** Include names, photos, results

### Pricing

- **Anchoring:** Show expensive option first
- **Tiered:** 3 tiers (Good, Better, Best)
- **Highlight:** Make middle option stand out
- **Psychological:** Use $299 instead of $300

### Mobile Optimization

- **CTA placement:** Above fold on mobile
- **Font size:** Minimum 16px
- **Touch targets:** 44px minimum buttons
- **Form fields:** One input per screen

## Automation

### Bulk Landing Page Generation

```bash
# Generate landing pages for multiple products
0 10 * * * /path/to/landing-page-generator/scripts/bulk_generate.py \
  --csv products.csv \
  --output-dir /path/to/landing-pages
```

### A/B Test Automation

```bash
# Generate variations for top pages
0 9 * * 1 /path/to/landing-page-generator/scripts/ab_test_variations.py \
  --input /path/to/top-pages/ \
  --variations 3 \
  --output-dir /path/to/ab-tests
```

## Integration Opportunities

### With Product Description Generator

```bash
# 1. Generate product description
product-description-generator/scripts/generate_description.py \
  --product "Course Name"

# 2. Extract benefits
# 3. Generate landing page
landing-page-generator/scripts/generate_landing.py \
  --benefits "[extracted]"
```

### With Review Summarizer

```bash
# 1. Get review insights
review-summarizer/scripts/scrape_reviews.py --url "[product_url]"

# 2. Extract pros/cons
# 3. Generate review page
landing-page-generator/scripts/generate_landing.py \
  --type affiliate-review \
  --pros "[extracted]" \
  --cons "[extracted]"
```

---

**Build pages. Convert visitors. Scale revenue.**
