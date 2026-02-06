# Permissions and Tokens

## 1) Token types

- User access token (used to fetch Page token).
- Page access token (used for Send API and management).

## 2) Common permissions

- `pages_messaging`
- `pages_manage_metadata`
- `pages_show_list`

## 3) Token flow

- Obtain user token with required scopes.
- Call `/me/accounts` to fetch Page access token.
- Use Page token for messaging actions.

## 4) Operational guidance

- Use least-privilege permissions.
- Rotate tokens when possible.
