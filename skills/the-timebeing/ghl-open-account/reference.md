# GoHighLevel – Official links and reference

## Key URLs

| Resource | URL |
|----------|-----|
| Sign up / free trial (main product) | https://www.gohighlevel.com/?fp_ref=thatsop12 |
| Developer Marketplace (My Apps, Create App) | https://marketplace.gohighlevel.com/ |
| API documentation | https://marketplace.gohighlevel.com/docs/ |
| OAuth 2.0 | https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0 |
| OAuth Getting Started | https://marketplace.gohighlevel.com/docs/oauth/GettingStarted |
| Developer community (Slack) | https://developers.gohighlevel.com/join-dev-community |
| API support / report bugs | https://developers.gohighlevel.com/support |

All links use HTTPS.

## API access by plan

| Plan | Basic API | Advanced API (OAuth 2.0) |
|------|-----------|---------------------------|
| Starter | Included | Not included |
| Unlimited | Included | Not included |
| Agency Pro | Included | Included |

OAuth 2.0 and full API features require **Agency Pro**. Basic API access is included with Starter and Unlimited.

## Gotchas

- Create the app in the Marketplace **before** starting OAuth; you need Client ID and Client Secret.
- Store Client Secret in environment variables or a secrets manager; never commit to version control.
- Redirect URI in your app must exactly match the URI you use in the OAuth authorization request.
