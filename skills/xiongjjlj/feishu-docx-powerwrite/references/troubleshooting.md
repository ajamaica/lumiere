# Troubleshooting (Feishu Docx PowerWrite)

## 1) Permission / 403 / no access
Typical causes:
- Feishu app scopes missing docx/drive permissions
- The bot/app isn’t added as a collaborator to the target doc

Fix:
- Re-check Feishu app scopes
- Share the doc to the bot/app (or make it accessible via org policy)

## 2) Content not rendered as expected
Common causes:
- Markdown too dense (giant paragraphs)
- Incorrect list indentation

Fix:
- Keep paragraphs short
- Use consistent 2-space indentation for nested lists

## 3) Replace mode didn’t overwrite
- Replace requires `confirm: true` (destructive)

## 4) Large docs
- Prefer chunked appends
- Append section-by-section (e.g., 1k–3k chars per chunk)
