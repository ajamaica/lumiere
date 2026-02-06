# Manual checklist (cannot be fully automated)

Use this when preparing the final “ready to submit” recommendation.

## App Store Connect listing
- [ ] App name/subtitle match branding guidelines (no trademark violations)
- [ ] Description, keywords, categories, age rating complete
- [ ] Screenshots/video for required devices (iPhone sizes; iPad if supported)
- [ ] App Review notes prepared (test user, demo content, feature flags)

## Privacy (high rejection risk)
- [ ] Privacy Policy URL is public and matches behaviour
- [ ] Privacy Nutrition Labels match actual data collection/sharing
- [ ] ATT (tracking prompt) is shown only when required, not gated/incentivised
- [ ] If data is shared with third‑party AI services, disclosures + explicit permission are in place (if applicable)

## Legal / licensing
- [ ] Third‑party licences included where required (open source compliance)
- [ ] Rights cleared for fonts, music, images, and user‑generated content flows
- [ ] Terms of Service available if needed

## Payments
- [ ] If selling digital goods/services: uses In‑App Purchase where required
- [ ] Subscriptions: configured (group, localisation, introductory offers), and restore flow works
- [ ] “Sign in with Apple” present when required (third‑party social login offered)

## Security / fraud
- [ ] No hardcoded credentials, tokens, private keys, or signing assets in the repo
- [ ] TLS / certificate pinning (if any) won’t break App Store review network conditions

## Region-specific
- [ ] EU Digital Services Act (DSA) trader status configured if distributing in the EU
- [ ] Any regulated content and local legal disclosures handled
