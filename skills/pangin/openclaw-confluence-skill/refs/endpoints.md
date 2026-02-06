# Confluence Cloud REST API v2 endpoints (by group)

Base: https://{site}.atlassian.net/wiki/api/v2

- Admin Key: /admin-key (GET/POST/DELETE)
- App Properties: /app/properties, /app/properties/{propertyKey}
- Pages: /pages, /pages/{id}, /pages/{id}/title, /spaces/{id}/pages, /labels/{id}/pages
- Blog Posts: /blogposts, /blogposts/{id}, /spaces/{id}/blogposts, /labels/{id}/blogposts
- Attachments: /attachments, /attachments/{id}, /pages/{id}/attachments, /blogposts/{id}/attachments, /custom-content/{id}/attachments, /labels/{id}/attachments
- Comments: /footer-comments, /inline-comments, children endpoints, per-content comment lists
- Children: /pages/{id}/children, /pages/{id}/direct-children, /folders/{id}/direct-children, /databases/{id}/direct-children, /whiteboards/{id}/direct-children, /embeds/{id}/direct-children
- Ancestors/Descendants: /{type}/{id}/ancestors, /{type}/{id}/descendants
- Labels: /labels, /pages/{id}/labels, /blogposts/{id}/labels, /attachments/{id}/labels, /custom-content/{id}/labels, /spaces/{id}/labels
- Likes: /pages/{id}/likes, /blogposts/{id}/likes, /comments/{id}/likes
- Operations: /{type}/{id}/operations
- Properties: /{type}/{id}/properties and /{type}/{id}/properties/{property-id}
- Custom Content: /custom-content, /custom-content/{id}, /spaces/{id}/custom-content
- Databases: /databases, /databases/{id}
- Embeds (Smart Links): /embeds, /embeds/{id}
- Folders: /folders, /folders/{id}
- Whiteboards: /whiteboards, /whiteboards/{id}
- Spaces: /spaces, /spaces/{id}
- Space Permissions: /space-permissions, /spaces/{id}/permissions
- Space Roles: /space-roles, /space-roles/{id}, /spaces/{id}/role-assignments
- Space Properties: /spaces/{id}/properties, /spaces/{id}/properties/{property-id}
- Classification: /classification-levels + per-content endpoints
- Redactions: /pages/{id}/redact, /blogposts/{id}/redact
- Tasks: /tasks, /tasks/{id}
- Users: /users-bulk, /user/access/check-access-by-email, /user/access/invite-by-email
- Content: /content/convert-ids-to-types
- Data Policies: /data-policies/metadata, /data-policies/spaces

For full details, read refs/openapi-v2.v3.json.
