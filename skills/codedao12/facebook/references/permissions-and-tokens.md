# Permissions and Tokens

## 1) Token types

- User access token (granted via OAuth).
- Page access token (used for Page content actions).

## 2) Common Page permissions

- `pages_manage_posts` (publish and edit Page posts)
- `pages_read_engagement` (read Page content/insights)
- `pages_manage_engagement` (moderate comments)
- `pages_show_list` (list Pages the user manages)

## 3) Recommended flow (high level)

- Obtain user token with required scopes.
- Call `/me/accounts` to get the Page access token.
- Use the Page token for Page publishing and comment moderation.

## 4) Operational guidance

- Use least privilege.
- Store tokens securely and rotate when possible.
- Expect permission review for production use.
