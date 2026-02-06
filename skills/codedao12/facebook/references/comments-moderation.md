# Comments and Moderation

## 1) List comments on a post

- Endpoint: `GET /{post-id}/comments`
- Common fields/params:
  - `fields` (e.g. `id,message,from,created_time`)
  - `filter` (top-level vs stream)

## 2) Add a comment

- Endpoint: `POST /{post-id}/comments`
- Field: `message`

## 3) Reply to a comment

- Endpoint: `POST /{comment-id}/comments`
- Field: `message`

## 4) Hide or delete a comment

- Hide: `POST /{comment-id}` with `is_hidden=true`
- Delete: `DELETE /{comment-id}`

## 5) Moderation workflow

- Validate comment text.
- Use hide for sensitive content when possible.
- Log minimal identifiers for audit.
