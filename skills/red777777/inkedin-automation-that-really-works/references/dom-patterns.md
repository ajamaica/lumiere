# LinkedIn DOM Patterns Reference

Known DOM patterns as of 2024/2025. LinkedIn frequently changes these — update when selectors break.

## Feed Items

- `[data-view-name="feed-full-update"]` — primary feed item wrapper
- `.feed-shared-update-v2` — alternative feed item class
- `[data-urn*="activity"]` — items with activity URN

## Post Text

- `.feed-shared-update-v2__description` — post description
- `.update-components-text` — text component
- `.break-words span[dir="ltr"]` — text spans

## Author

- `.update-components-actor__name span[aria-hidden="true"]` — author display name
- `.update-components-actor__title span` — fallback
- `a.update-components-actor__meta-link span` — meta link

## Post URL

- `a[href*="/feed/update/"]` — direct feed update links
- `a[href*="activity"]` — activity links

## Comment Box

- `[data-placeholder*="Kommentar"]` — German placeholder
- `[data-placeholder*="comment"]` — English placeholder
- `.comments-comment-texteditor [role="textbox"]` — role-based
- `.comments-comment-box [role="textbox"]` — box variant
- `.comments-comment-texteditor .ql-editor` — Quill editor
- `.comments-comment-texteditor [contenteditable="true"]` — contenteditable

## Submit Button (Comment)

- `button.comments-comment-box__submit-button` — class-based
- `button[aria-label*="Posten"]` — German aria
- `button[aria-label*="Post"]` — English aria
- `button[aria-label*="Absenden"]` — German "send"
- `button[class*="submit"]` — generic fallback
- Text content: "posten", "post", "absenden"

## Start Post Button

- `button.share-box-feed-entry__trigger` — feed trigger
- `button[aria-label*="Beitrag"]` — German
- `button[aria-label*="Start a post"]` — English

## Post Submit (Modal)

- `button.share-actions__primary-action` — primary action
- `.share-actions button[aria-label*="Posten"]` — German
- `.share-actions button[aria-label*="Post"]` — English

## Comment Menu (3-dot)

- `button[aria-label*="Weitere Aktionen"]` — German "More actions"
- `button[aria-label*="More actions"]` — English
- `button[aria-label*="Optionen"]` — German "Options"
- Small buttons with SVG icons (< 50px width) near comment text

## Menu Items

- `[role="menuitem"]` — standard menu items
- `[role="option"]` — option items
- Text matches: "Löschen"/"Delete", "Bearbeiten"/"Edit"

## Repost Button

- `button[aria-label*="Repost"]` — English
- `button[aria-label*="Erneut"]` — German "again"
- `button[aria-label*="teilen"]` — German "share"

## Mention/Autocomplete Dropdown

- `[role="option"]` — dropdown items
- `[role="listbox"] li` — listbox items
- `[class*="mention"] li` — mention-specific
- `[class*="typeahead"] li` — typeahead suggestions

## Confirm Dialogs

- Buttons with text "Löschen"/"Delete"/"Ja" in modal dialogs
- Usually standard `<button>` elements
