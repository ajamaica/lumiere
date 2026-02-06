# Gutenberg Blocks Reference

Complete reference for WordPress Gutenberg block formats with validation rules.

## Block Structure Overview

Every Gutenberg block follows this pattern:

```html
<!-- wp:block-name {"attribute":"value"} -->
<html-content>Content here</html-content>
<!-- /wp:block-name -->
```

**Critical Rules:**

1. Opening and closing comments MUST match exactly
2. JSON attributes MUST be valid JSON
3. HTML structure MUST match the block type
4. Classes MUST follow WordPress patterns

---

## Text Blocks

### Paragraph

```html
<!-- wp:paragraph -->
<p>Plain paragraph text.</p>
<!-- /wp:paragraph -->
```

**With alignment:**

```html
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Centered text.</p>
<!-- /wp:paragraph -->
```

**With drop cap:**

```html
<!-- wp:paragraph {"dropCap":true} -->
<p class="has-drop-cap">First letter will be large drop cap.</p>
<!-- /wp:paragraph -->
```

### Heading

**H2 (default - no level attribute needed):**

```html
<!-- wp:heading -->
<h2 class="wp-block-heading">H2 Heading</h2>
<!-- /wp:heading -->
```

**Other levels:**

```html
<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">H1 Heading</h1>
<!-- /wp:heading -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">H3 Heading</h3>
<!-- /wp:heading -->

<!-- wp:heading {"level":4} -->
<h4 class="wp-block-heading">H4 Heading</h4>
<!-- /wp:heading -->
```

**With alignment:**

```html
<!-- wp:heading {"level":3,"textAlign":"center"} -->
<h3 class="wp-block-heading has-text-align-center">Centered H3</h3>
<!-- /wp:heading -->
```

### List

**Unordered list:**

```html
<!-- wp:list -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
<!-- /wp:list -->
```

**Ordered list:**

```html
<!-- wp:list {"ordered":true} -->
<ol>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ol>
<!-- /wp:list -->
```

**Ordered list starting at specific number:**

```html
<!-- wp:list {"ordered":true,"start":5} -->
<ol start="5">
  <li>Starts at 5</li>
  <li>Then 6</li>
</ol>
<!-- /wp:list -->
```

**Nested lists:**

```html
<!-- wp:list -->
<ul>
  <li>
    Parent item
    <ul>
      <li>Nested item 1</li>
      <li>Nested item 2</li>
    </ul>
  </li>
  <li>Another parent</li>
</ul>
<!-- /wp:list -->
```

### Quote

```html
<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>Quote text here.</p></blockquote>
<!-- /wp:quote -->
```

**With citation:**

```html
<!-- wp:quote -->
<blockquote class="wp-block-quote">
  <p>Quote text here.</p>
  <cite>— Attribution</cite>
</blockquote>
<!-- /wp:quote -->
```

**Large style:**

```html
<!-- wp:quote {"className":"is-style-large"} -->
<blockquote class="wp-block-quote is-style-large"><p>Large style quote.</p></blockquote>
<!-- /wp:quote -->
```

### Preformatted

```html
<!-- wp:preformatted -->
<pre class="wp-block-preformatted">
Preformatted text
preserves    spacing
and line breaks</pre
>
<!-- /wp:preformatted -->
```

---

## Data Blocks

### Table (CRITICAL FOR AI CONTENT)

**Basic table:**

```html
<!-- wp:table -->
<figure class="wp-block-table">
  <table>
    <thead>
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
        <th>Header 3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Row 1, Cell 1</td>
        <td>Row 1, Cell 2</td>
        <td>Row 1, Cell 3</td>
      </tr>
      <tr>
        <td>Row 2, Cell 1</td>
        <td>Row 2, Cell 2</td>
        <td>Row 2, Cell 3</td>
      </tr>
    </tbody>
  </table>
</figure>
<!-- /wp:table -->
```

**⚠️ COMMON MISTAKES:**

- Missing `<figure class="wp-block-table">` wrapper → Block fails to render
- Missing `<thead>` → Table may not style correctly
- Putting attributes on wrong element

**Striped table:**

```html
<!-- wp:table {"className":"is-style-stripes"} -->
<figure class="wp-block-table is-style-stripes">
  <table>
    <thead>
      <tr>
        <th>Header</th>
        <th>Header</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data</td>
        <td>Data</td>
      </tr>
    </tbody>
  </table>
</figure>
<!-- /wp:table -->
```

**Fixed layout (equal width columns):**

```html
<!-- wp:table {"hasFixedLayout":true} -->
<figure class="wp-block-table">
  <table class="has-fixed-layout">
    <thead>
      <tr>
        <th>Fixed</th>
        <th>Width</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data</td>
        <td>Data</td>
      </tr>
    </tbody>
  </table>
</figure>
<!-- /wp:table -->
```

**With caption:**

```html
<!-- wp:table -->
<figure class="wp-block-table">
  <table>
    <thead>
      <tr>
        <th>Header</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data</td>
      </tr>
    </tbody>
  </table>
  <figcaption class="wp-element-caption">Table caption text</figcaption>
</figure>
<!-- /wp:table -->
```

### Code

**Basic code block:**

```html
<!-- wp:code -->
<pre class="wp-block-code"><code>function hello() {
    console.log("Hello World");
}</code></pre>
<!-- /wp:code -->
```

**With language for syntax highlighting:**

```html
<!-- wp:code {"language":"python"} -->
<pre class="wp-block-code"><code lang="python">def hello():
    print("Hello World")</code></pre>
<!-- /wp:code -->
```

**Supported languages:** `python`, `javascript`, `php`, `bash`, `sql`, `html`, `css`, `json`, `yaml`, `markdown`, `ruby`, `go`, `rust`, `java`, `csharp`, `typescript`

### HTML (Raw)

For custom HTML that doesn't fit other blocks:

```html
<!-- wp:html -->
<div class="custom-html">
  <iframe src="https://example.com/embed"></iframe>
</div>
<!-- /wp:html -->
```

---

## Media Blocks

### Image

**Basic image:**

```html
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large">
  <img src="https://example.com/image.jpg" alt="Description" />
</figure>
<!-- /wp:image -->
```

**With WordPress media ID:**

```html
<!-- wp:image {"id":123,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large">
  <img src="https://example.com/image.jpg" alt="Description" class="wp-image-123" />
</figure>
<!-- /wp:image -->
```

**With caption:**

```html
<!-- wp:image {"id":123,"sizeSlug":"large"} -->
<figure class="wp-block-image size-large">
  <img src="URL" alt="Alt text" class="wp-image-123" />
  <figcaption class="wp-element-caption">Caption text here</figcaption>
</figure>
<!-- /wp:image -->
```

**Aligned image:**

```html
<!-- wp:image {"align":"center","sizeSlug":"medium"} -->
<figure class="wp-block-image aligncenter size-medium"><img src="URL" alt="" /></figure>
<!-- /wp:image -->
```

**Wide/Full width:**

```html
<!-- wp:image {"align":"wide"} -->
<figure class="wp-block-image alignwide"><img src="URL" alt="" /></figure>
<!-- /wp:image -->

<!-- wp:image {"align":"full"} -->
<figure class="wp-block-image alignfull"><img src="URL" alt="" /></figure>
<!-- /wp:image -->
```

### Gallery

```html
<!-- wp:gallery {"linkTo":"none","columns":3} -->
<figure class="wp-block-gallery has-nested-images columns-3 is-cropped">
  <!-- wp:image {"id":1} -->
  <figure class="wp-block-image"><img src="URL1" alt="" class="wp-image-1" /></figure>
  <!-- /wp:image -->
  <!-- wp:image {"id":2} -->
  <figure class="wp-block-image"><img src="URL2" alt="" class="wp-image-2" /></figure>
  <!-- /wp:image -->
  <!-- wp:image {"id":3} -->
  <figure class="wp-block-image"><img src="URL3" alt="" class="wp-image-3" /></figure>
  <!-- /wp:image -->
</figure>
<!-- /wp:gallery -->
```

### Video

```html
<!-- wp:video -->
<figure class="wp-block-video"><video controls src="https://example.com/video.mp4"></video></figure>
<!-- /wp:video -->
```

### Audio

```html
<!-- wp:audio -->
<figure class="wp-block-audio"><audio controls src="https://example.com/audio.mp3"></audio></figure>
<!-- /wp:audio -->
```

---

## Layout Blocks

### Separator (Horizontal Rule)

```html
<!-- wp:separator -->
<hr class="wp-block-separator has-alpha-channel-opacity" />
<!-- /wp:separator -->
```

**Wide style:**

```html
<!-- wp:separator {"className":"is-style-wide"} -->
<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide" />
<!-- /wp:separator -->
```

### Spacer

```html
<!-- wp:spacer {"height":"50px"} -->
<div style="height:50px" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer -->
```

### Group

```html
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:paragraph -->
  <p>Grouped content here</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

### Columns

**Two columns:**

```html
<!-- wp:columns -->
<div class="wp-block-columns">
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:paragraph -->
    <p>Column 1 content</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:paragraph -->
    <p>Column 2 content</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->
```

**Three columns with specific widths:**

```html
<!-- wp:columns -->
<div class="wp-block-columns">
  <!-- wp:column {"width":"50%"} -->
  <div class="wp-block-column" style="flex-basis:50%">
    <p>50% width</p>
  </div>
  <!-- /wp:column -->
  <!-- wp:column {"width":"25%"} -->
  <div class="wp-block-column" style="flex-basis:25%">
    <p>25% width</p>
  </div>
  <!-- /wp:column -->
  <!-- wp:column {"width":"25%"} -->
  <div class="wp-block-column" style="flex-basis:25%">
    <p>25% width</p>
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->
```

---

## Interactive Blocks

### Button

**Single button:**

```html
<!-- wp:buttons -->
<div class="wp-block-buttons">
  <!-- wp:button -->
  <div class="wp-block-button">
    <a class="wp-block-button__link wp-element-button" href="https://example.com">Click Me</a>
  </div>
  <!-- /wp:button -->
</div>
<!-- /wp:buttons -->
```

**Centered buttons:**

```html
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
  <!-- wp:button -->
  <div class="wp-block-button">
    <a class="wp-block-button__link wp-element-button" href="#">Button Text</a>
  </div>
  <!-- /wp:button -->
</div>
<!-- /wp:buttons -->
```

**Outline style:**

```html
<!-- wp:buttons -->
<div class="wp-block-buttons">
  <!-- wp:button {"className":"is-style-outline"} -->
  <div class="wp-block-button is-style-outline">
    <a class="wp-block-button__link wp-element-button" href="#">Outline Button</a>
  </div>
  <!-- /wp:button -->
</div>
<!-- /wp:buttons -->
```

### Details/Accordion

```html
<!-- wp:details -->
<details class="wp-block-details">
  <summary>Click to expand</summary>
  <!-- wp:paragraph -->
  <p>Hidden content revealed on click.</p>
  <!-- /wp:paragraph -->
</details>
<!-- /wp:details -->
```

---

## Embed Blocks

### YouTube

```html
<!-- wp:embed {"url":"https://www.youtube.com/watch?v=VIDEO_ID","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube">
  <div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=VIDEO_ID</div>
</figure>
<!-- /wp:embed -->
```

### Twitter/X

```html
<!-- wp:embed {"url":"https://twitter.com/user/status/123456789","type":"rich","providerNameSlug":"twitter"} -->
<figure class="wp-block-embed is-type-rich is-provider-twitter wp-block-embed-twitter">
  <div class="wp-block-embed__wrapper">https://twitter.com/user/status/123456789</div>
</figure>
<!-- /wp:embed -->
```

### Generic Embed

```html
<!-- wp:embed {"url":"https://example.com/embed-content"} -->
<figure class="wp-block-embed">
  <div class="wp-block-embed__wrapper">https://example.com/embed-content</div>
</figure>
<!-- /wp:embed -->
```

---

## Styling Attributes Reference

Common attributes that work on most blocks:

```json
{
  "align": "left|center|right|wide|full",
  "className": "custom-class another-class",
  "backgroundColor": "primary|secondary|tertiary",
  "textColor": "primary|secondary|white|black",
  "fontSize": "small|medium|large|x-large",
  "style": {
    "color": {
      "background": "#hex-color",
      "text": "#hex-color"
    },
    "spacing": {
      "padding": {
        "top": "20px",
        "bottom": "20px",
        "left": "20px",
        "right": "20px"
      },
      "margin": {
        "top": "20px",
        "bottom": "20px"
      }
    },
    "border": {
      "radius": "10px",
      "width": "1px",
      "color": "#hex-color"
    }
  }
}
```

---

## Character Escaping Rules

In block content, escape these HTML special characters:

| Character | Escape   | When to Use                    |
| --------- | -------- | ------------------------------ |
| `<`       | `&lt;`   | In text content, not HTML tags |
| `>`       | `&gt;`   | In text content, not HTML tags |
| `&`       | `&amp;`  | In text content                |
| `"`       | `&quot;` | In HTML attributes             |

**Example:**

```html
<!-- wp:paragraph -->
<p>Compare X &gt; Y means &quot;X is greater than Y&quot;</p>
<!-- /wp:paragraph -->
```

---

## Block Validation Rules

WordPress validates blocks on save. Invalid blocks show error: "This block contains unexpected or invalid content."

**Validation checklist:**

1. ✅ Opening comment matches closing comment exactly
2. ✅ JSON attributes are valid (no trailing commas, proper quotes)
3. ✅ HTML structure matches block type requirements
4. ✅ Required wrapper elements present (figure for tables/images)
5. ✅ Classes match expected WordPress patterns
6. ✅ Proper nesting of inner blocks

---

## Common Errors and Fixes

| Error                         | Cause                           | Fix                                                      |
| ----------------------------- | ------------------------------- | -------------------------------------------------------- |
| Block shows "invalid content" | Mismatched opening/closing tags | Verify `wp:blockname` matches in both                    |
| Table not rendering           | Missing `<figure>` wrapper      | Wrap table in `<figure class="wp-block-table">`          |
| Image not displaying          | Wrong class name                | Use `wp-block-image` class on figure                     |
| Code not highlighting         | Missing language attribute      | Add `{"language":"python"}` to block                     |
| JSON parse error              | Invalid JSON syntax             | Check for missing quotes, trailing commas                |
| Nested blocks fail            | Wrong nesting structure         | Ensure inner blocks are inside outer block's content div |

---

## Testing Blocks

To test if your Gutenberg content is valid:

1. Create a test post in WordPress
2. Switch to Code Editor (⋮ menu → Code editor)
3. Paste your block content
4. Switch back to Visual Editor
5. If blocks render correctly, they're valid
6. If you see "Attempt Block Recovery", there's an error

**Quick validation in Python:**

```python
from scripts.content_to_gutenberg import validate_gutenberg_blocks

content = "<!-- wp:paragraph --><p>Test</p><!-- /wp:paragraph -->"
issues = validate_gutenberg_blocks(content)
if issues:
    print("Errors:", issues)
else:
    print("Valid!")
```
