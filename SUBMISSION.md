# Marketplace submission: Dictionary Editor

Copy-paste text for Sitecore's public-app submission form, in form order.
Replace `{{APP_URL}}` with the production deployment URL before submitting.

## 1. App name

Dictionary Editor

## 2. Headline

<!-- 406 chars -->

Manage a SitecoreAI site's dictionary on one screen. Browse entries by folder, see keys and phrases side by side in any language, find every entry missing a translation, edit all languages of an entry in one form, add entries with auto-generated keys, and publish the dictionary in one click. Optionally fill missing translations with OpenAI, Anthropic, Google or your own endpoint, reviewed before saving.

## 3. Description

In SitecoreAI, dictionary entries are ordinary items under a site's Dictionary folder, and the standard way to maintain them is the Content Editor: one item at a time, one language at a time, with no overview of which phrases still need translating. Dictionary Editor gives each site's dictionary a single screen for content authors.

Key features:
- Site selector and folder navigation (All, A-Z, 0-9 and any other named folders)
- Entry table with name, key, phrase and translation status, paged 15, 30 or 50 at a time
- Display language switch; entries with no phrase in that language are marked Missing Translation
- Find missing translations across a folder or the whole dictionary
- Entry editor for the phrase in every site language plus a description; missing language versions are created on save
- Add entry: the key is derived from the name using one of ten key formats (camelCase, PascalCase, dot.notation, snake_case, kebab-case and more), and a missing letter folder is created automatically
- Delete with confirmation (entries go to the recycle bin); the delete column can be hidden
- One-click smart publish of the dictionary to Experience Edge in the selected languages
- Optional AI and machine translation with OpenAI, Anthropic, Google Cloud Translation or a custom endpoint, using your own provider account and API key (stored encrypted); results are labelled and are not saved until you review them

Use cases:
- Find and fill translation gaps before a multilingual launch
- Add and maintain UI labels without hunting through letter folders
- Translate a new entry into every site language in one step

All reads and writes run with the signed-in user's own SitecoreAI permissions.

## 4. Financial model

Free

## 5. Categories

Suggested (match to the portal's category list before submitting):
- Localization
- Content management

## 6. Screenshots to capture

PNG, shown as 600×900 thumbnails. Capture during live QA. `docs/Entry list.png` and `docs/Entry Editor.png` can be reused if they still match the current UI.

1. Entry list for a site with folder buttons, display language set to a second language and some rows marked Missing Translation.
2. Entry editor with phrases in several languages and a translation suggestion filled in (AI-generated label visible).
3. Add entry dialog showing the derived key and preselected letter folder.
4. Settings › Translations tab with a provider selected and the AI notice visible (API key masked).
5. Publish dialog listing the languages before confirming.

## 7. Links

- Website: https://github.com/robertobarbedo/sitecoreai-marketplace-dictionary
- Support: https://github.com/robertobarbedo/sitecoreai-marketplace-dictionary/issues
- Privacy policy: https://github.com/robertobarbedo/sitecoreai-marketplace-dictionary/blob/main/PRIVACY.md
- Terms of service: https://github.com/robertobarbedo/sitecoreai-marketplace-dictionary/blob/main/TERMS.md

## 8. Data usage disclosure

Paste from `DATA-USAGE.md`.

Summary: dictionary content is read and written through the Marketplace SDK with the user's own permissions, and settings are stored as items in the customer's own environment; the app has no database. The app's server is used only when a user clicks Translate: it forwards one phrase and its context to the provider the customer configured, with the customer's own encrypted API key, and keeps nothing. Server audit logs (no phrases, translations, tokens or keys) are kept for 90 days.

## 9. AI usage disclosure switch

**On.** Paste/point to the "AI usage disclosure" section of `DATA-USAGE.md` (features, providers and models, data sent, data and security, human oversight). The AI feature is optional translation suggestions (OpenAI, Anthropic; Google Cloud Translation is non-generative machine translation; custom endpoint is customer-chosen), off until a provider is configured.

## 10. Configuration tab

- Extension point: **Full Screen**, route `/`.
- API access: **SitecoreAI APIs** (the app calls `xmc.authoring.graphql` through the Marketplace SDK, plus `application.context`).
- Permissions: none required by the code (no `window.open`, clipboard or file downloads). Note: the toast after Publish links to the publishing jobs page with `target="_blank"`; if that link doesn't open in the portal iframe during QA, enable **Pop-ups**.
- Deployment URL: `{{APP_URL}}`
- Client credentials (custom authorization): **Yes**, required for the `/api/translate/*` routes (the dictionary itself works without it). Create Single-page app credentials and register:
  - Allowed callback URL: `{{APP_URL}}/` (with trailing slash)
  - Logout URL, web origin, CORS origin: `{{APP_URL}}`
- Environment variables on the host:
  - `NEXT_PUBLIC_AUTH0_CLIENT_ID` (required)
  - `NEXT_PUBLIC_SITECORE_APP_ID` (required)
  - `DICTIONARY_SECRET_ENCRYPTION_KEY` (required; server-only, 16+ characters, `openssl rand -base64 32`)
  - Optional: `NEXT_PUBLIC_AUTH0_DOMAIN`, `NEXT_PUBLIC_AUTH0_AUDIENCE`, `NEXT_PUBLIC_AUTH0_SCOPE`, `AUTH0_ISSUER`, `CSP_FRAME_ANCESTORS`
- App logo: `translate-duotone.svg`

## 11. Submission details (visible only to Sitecore)

- Contact name: `Roberto Barbedo`
- Contact email: `rb205@proton.me`

**App functionality**

Dictionary Editor is a Next.js 15 full-stack app on the Full Screen extension point. All dictionary and settings operations run in the browser through the Marketplace SDK against the Authoring and Management GraphQL API (`xmc.authoring.graphql`, master database) of the environment the app was opened in: listing sites and dictionary folders, reading and writing Dictionary Entry items, searching `sitecore_master_index`, and running `publishItem` (Smart, to Experience Edge). Translation is the only server-side feature: the browser calls the app's `/api/translate/{openai|anthropic|google|custom}` routes with a Sitecore Cloud token from custom authorization (Auth0 SPA client credentials), and the server calls the provider with the customer's own API key. Per-site language settings and the environment's translation settings (with API keys sealed by `/api/translate/seal`) are stored as JSON items under `/sitecore/system/Modules/Marketplace/DictionaryEditor` in the customer's environment; general preferences are kept in localStorage and the selected site in a cookie. There is no database.

**Business value / alignment with Sitecore standards**

The app replaces item-by-item dictionary maintenance in the Content Editor with one overview, which makes translation gaps visible and speeds up localization. It uses only supported Marketplace SDK APIs and standard Sitecore templates and fields, and every content operation runs with the signed-in user's own permissions. The UI follows the Blok design language (Tailwind CSS v4, Radix UI). Security measures: server-side token verification on every translate route (signature, issuer, audience, expiry and `azp` bound to this app's client ID); provider API keys sealed with AES-256-GCM (HKDF-SHA256 key from `DICTIONARY_SECRET_ENCRYPTION_KEY`), decrypted only on the server and sent only to the fixed provider hosts; an SSRF guard for the custom endpoint (public http/https on ports 80/443, host names only, DNS-pinned public-address check, no redirects, 20 s timeout); input limits and a per-user rate limit (30 requests per minute); model output validated and shown as plain text only; security headers on every response (HSTS, CSP frame-ancestors limited to SitecoreAI, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) and `Cache-Control: no-store` on API routes; and JSON audit logging of sign-in, translate and seal events without phrases, tokens or keys. AI output is labelled and requires human review before saving. Fonts are self-hosted; no analytics.

**Licensing note**

Next.js lists sharp (LGPL-3.0 libvips) as an optional dependency for image optimization; this app doesn't use next/image and sets images.unoptimized, so sharp is never loaded. lightningcss (MPL-2.0) is a build-time-only dependency of Tailwind CSS and is not shipped.

## 12. Pre-submit checklist

- [ ] Live QA: browse, search, add, edit, delete and publish entries on a multilingual site
- [ ] Live QA: Find missing translations and the Missing Translation markers
- [ ] Live QA: translate with each provider you list (OpenAI, Anthropic, Google, custom endpoint); key sealing and the AI labels/notice
- [ ] `NEXT_PUBLIC_AUTH0_CLIENT_ID`, `NEXT_PUBLIC_SITECORE_APP_ID` and `DICTIONARY_SECRET_ENCRYPTION_KEY` set on the production host; app rebuilt
- [ ] Production client credentials registered with `{{APP_URL}}` callback, logout, web origin and CORS URLs
- [ ] AI usage disclosure switch set to On with the DATA-USAGE.md AI section
- [ ] Screenshots captured (PNG)
- [ ] `{{APP_URL}}` replaced with the production deployment URL in this form
