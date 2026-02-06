# Page Posting Guide

## 1) Create a Page post

- Endpoint: `POST /{page-id}/feed`
- Common fields:
  - `message` (text content)
  - `link` (URL to attach)
  - `published` (true/false)
  - `scheduled_publish_time` (unix timestamp)

## 2) Create a photo post

- Endpoint: `POST /{page-id}/photos`
- Common fields:
  - `url` or `source` (binary upload)
  - `caption`
  - `published`

## 3) Create a video post

- Endpoint: `POST /{page-id}/videos`
- Common fields:
  - `file_url` or `source`
  - `description`
  - `published`

## 4) Read posts

- Endpoint: `GET /{page-id}/posts`
- Common fields/params:
  - `fields` (e.g. `id,message,created_time,permalink_url`)
  - `limit`, `since`, `until`

## 5) Update or delete

- Update post: `POST /{post-id}` (fields you want to change)
- Delete post: `DELETE /{post-id}`

## Notes

- Page access token required for publish actions.
- Keep messages concise and avoid frequent edits.
