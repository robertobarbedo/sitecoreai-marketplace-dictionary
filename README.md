# Dictionary Editor

A SitecoreAI Marketplace app for content authors who create, edit, translate
and publish a site's dictionary entries.

In SitecoreAI (XM Cloud), dictionary entries are ordinary items under a site's
`Dictionary` folder, and the standard way to maintain them is the Content
Editor: one item at a time, one language at a time, with no overview of which
phrases still need translating. Finding an entry means knowing which
letter folder it lives in, and checking translations means switching
languages item by item.

Dictionary Editor gives each site's dictionary a single screen. You browse
entries by folder, see the key and phrase side by side in any language, find
every entry that is missing a translation, edit all languages of an entry in
one form, and add new entries with keys generated from their names. Missing
translations can optionally be filled in by an AI or machine translation
provider you configure; nothing is saved until you review it.

![Entry list](docs/Entry%20list.png)

## Features

- **Site selector** — lists every site in the environment; the last choice is
  remembered in the browser.
- **Folder navigation** — buttons for **All**, **A–Z** and **0-9** (disabled
  when that folder does not exist), plus any other named folders, with a "See
  more" expander when there are more than six.
- **Entry table** — name, key, phrase and translation status, paged 15, 30 or
  50 at a time.
- **Display language** — show phrases in any of the site's languages; entries
  with no phrase in that language are marked **Missing Translation**.
- **Find missing translations** — scans the selected folder (or the whole
  dictionary) for entries that have no phrase in the display language.
- **Entry editor** — edit the phrase in every site language and an optional
  description on one screen; missing language versions are created on save,
  and unsaved changes are guarded by a confirmation dialog.
- **AI and machine translation** — translate one language or all missing
  languages of an entry with OpenAI, Anthropic, Google Cloud Translation or
  your own endpoint (see
  [AI and machine translation](#ai-and-machine-translation)).
- **Add entry** — enter a name and the key is derived from it using the
  configured key rule; the matching letter folder is preselected, and a
  missing letter folder is created with the entry.
- **Key rules** — ten key formats (PascalCase, camelCase, dot.notation,
  snake_case, kebab-case, upper-case variants, Title Case, lowercase), or turn
  auto-formatting off.
- **Delete** — with confirmation; deleted entries go to the recycle bin. The
  delete column can be hidden in Settings.
- **Publish** — one-click smart publish of the site's dictionary to
  Experience Edge, with a link to the publishing jobs page.

![Entry editor](docs/Entry%20Editor.png)

## How it works

- **Extension point:** Full Screen, served from the root route `/`. The app
  works against the environment it was opened in, using the preview context
  ID from the SDK's `application.context`.
- **Content API:** all dictionary reads and writes go through the Authoring
  and Management GraphQL API (`xmc.authoring.graphql`) via the
  [Sitecore Marketplace SDK](https://doc.sitecore.com/mp/en/developers/marketplace/introduction-to-sitecore-marketplace.html),
  against the `master` database, with the signed-in user's own permissions.
- **Translation:** the browser calls the app's own `/api/translate/*` routes,
  which call the configured translation provider. These routes require a
  Sitecore Cloud sign-in (see [Security and privacy](#security-and-privacy)).

```
Browser (app iframe) -> Marketplace SDK -> SitecoreAI host
                     -> Authoring GraphQL (master db): sites, dictionary,
                        settings, publish

Browser -> /api/translate/<provider> (this app's server, signed-in only)
        -> OpenAI | Anthropic | Google | custom endpoint
```

**Dictionary structure.** The dictionary root is `<site root>/Dictionary`.
Folders use the Dictionary Folder template
(`{267D9AC7-5D85-4E9D-AF89-99AB296CC218}`) and entries the Dictionary Entry
template (`{6D1CD897-1936-4A3A-A511-289A94C2A7B1}`) with the `Key` and
`Phrase` fields. The entry description is stored in the standard
`__Long description` field. Entries whose name starts with a digit belong in a
single `0-9` folder.

**Languages.** Each site has a base language and a list of available
languages. The base language defaults to the site's language; the available
languages default to the site's `Settings` item **Supported languages** field,
or every language under `/sitecore/system/Languages` if that field is empty.
Listing always runs in the base language; the display language is used only
to fetch the phrase shown in the table.

**Missing translation.** An entry is missing a translation in the display
language when it has no version in that language or its `Phrase` is empty
there.

**Search.** Uses the `sitecore_master_index` search with a "contains" match on
the item name, scoped to the site's dictionary and the base language.

**Publish.** Runs `publishItem` on the dictionary root with mode `SMART`,
sub-items included and related items excluded, to the Experience Edge target,
in the base language and every language the editor shows (the languages
selected in Settings, or the site's languages). The dialog lists them before
you confirm.

## Requirements

- A SitecoreAI (XM Cloud) environment with at least one site that has a
  `Dictionary` folder under its root.
- An Organization Admin or Owner to create and install the app in App Studio.
- Users of the app need:
  - read and write access to the site's `Dictionary` folder and its entries
    (and delete rights if deletion is enabled),
  - write access to `/sitecore/system/Modules`, where the app creates
    `Marketplace/DictionaryEditor` the first time settings are saved,
  - publish rights to use Publish.
- For translation (optional): an account and API key with the provider you
  choose, or your own translation endpoint.
- For the deployment: **Single-page app** client credentials from the Cloud
  Portal and an encryption key for stored API keys (see
  [Deploy your own instance](#deploy-your-own-instance)).

## Install in SitecoreAI

1. In the Cloud Portal, open **App Studio** and choose **Create app**.
2. Enter an app name (for example, Dictionary Editor) and select the type
   **Custom**.
3. Add the **Full Screen** extension point with the route `/`.
4. Under API access, enable **SitecoreAI APIs**.
5. No additional permissions are needed.
6. Set the deployment URL to `https://<your-deployment>/`.
7. Upload the app logo from [`icon-dictionary.svg`](icon-dictionary.svg).
8. Enable custom authorization and create client credentials of type
   **Single-page app**. Register the deployment origin (for example
   `https://<your-deployment>/`, with the trailing `/`) as the allowed
   callback URL, logout URL, web origin and CORS origin.
9. Put the client ID in `NEXT_PUBLIC_AUTH0_CLIENT_ID` and the app ID in
   `NEXT_PUBLIC_SITECORE_APP_ID` on your deployment, then redeploy.
10. Save, then install the app in your organization and grant it access to
    the environment.
11. Open the app from the SitecoreAI apps menu.

## Deploy your own instance

```sh
npm install
npm run build
npm start
```

`npm start` serves the app on port 5002. Deploy to Vercel or any Node.js host
that can run Next.js (the `/api` routes need a server), then set the
deployment URL of your App Studio app to the public HTTPS URL.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Yes | Client ID of the app's Single-page app client credentials. Without it, sign-in is not configured and translation is unavailable. Public, inlined at build time. |
| `NEXT_PUBLIC_SITECORE_APP_ID` | Yes | Marketplace app ID, sent as `product_codes=mkp_<id>` at sign-in. Public, inlined at build time. |
| `DICTIONARY_SECRET_ENCRYPTION_KEY` | Yes | Server-only secret (16+ characters) used to encrypt provider API keys. Generate one with `openssl rand -base64 32`. Changing it means users must re-enter their API keys. |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | No | Defaults to `auth.sitecorecloud.io`. |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | No | Defaults to `https://api-webapp.sitecorecloud.io`. |
| `NEXT_PUBLIC_AUTH0_SCOPE` | No | Defaults to `openid profile email offline_access`. |
| `AUTH0_ISSUER` | No | Token issuer checked by the server. Defaults to `https://auth.sitecorecloud.io/`. |
| `CSP_FRAME_ANCESTORS` | No | Space-separated CSP sources allowed to embed the app (`Content-Security-Policy: frame-ancestors`). Defaults to `'self' https://*.sitecorecloud.io`. |

Copy [`.env.example`](.env.example) to `.env.local` to set them locally. Only
override the Auth0 defaults if Sitecore changes them.

The app only runs inside SitecoreAI. The Marketplace SDK needs the host
iframe; opening the deployment URL directly in a browser shows a connection
error. For local development, run `npm run dev` (port 5002), expose it over
HTTPS (for example with ngrok), and register that URL in a separate
development app in App Studio.

## Configuration

Open **Settings** from the app header. There are three tabs:

- **Languages** (per site) — the base language and the languages available in
  the display-language list and the entry editor. Stored as JSON in
  `/sitecore/system/Modules/Marketplace/DictionaryEditor/<site>/Settings`.
- **General** — key format (default camelCase), **Disable Auto-Format** and
  **Disable Deletion** (both off by default). Stored in the browser's
  `localStorage`, so they apply to that browser only.
- **Translations** — the translation provider (default OpenAI, with no key
  set), API keys, model names (defaults `gpt-5-nano` for OpenAI and
  `claude-opus-5-5` for Anthropic) and URLs. Stored for the whole environment
  in `/sitecore/system/Modules/Marketplace/DictionaryEditor/TranslationSettings`,
  with API keys encrypted.

Settings saved by earlier versions under
`/sitecore/system/Modules/DictionaryEditor/` are still read; the next save
writes to the new location. The selected site is remembered in the
`dictionary_selected_site` cookie for one year.

### Custom endpoint format

The custom provider sends a `POST` with this JSON body:

```json
{
  "siteName": "my-site",
  "dictionaryName": "Dictionary",
  "key": "homepage.welcome",
  "phrase": "Welcome to our website",
  "baseLanguage": "en",
  "description": "Greeting shown on the homepage hero",
  "targetLanguages": ["fr-FR", "de-DE"]
}
```

and expects an array in return:

```json
[
  { "languageCode": "fr-FR", "translation": "Bienvenue sur notre site" },
  { "languageCode": "de-DE", "translation": "Willkommen auf unserer Website" }
]
```

## AI and machine translation

The entry editor can fill in missing translations automatically. This uses AI
or machine translation, depending on the provider chosen in **Settings ›
Translations**:

| Provider | Type | Data sent when the user clicks Translate |
| --- | --- | --- |
| OpenAI (default model `gpt-5-nano`) | Generative AI | Phrase, source language, description, entry name, dictionary key, site and dictionary name, target languages |
| Anthropic (Claude, default model `claude-opus-5-5`) | Generative AI | Phrase, source language, description, entry name, dictionary key, site and dictionary name, target languages |
| Google Cloud Translation (v2) | Machine translation (non-generative) | Phrase, source language, target languages |
| Custom endpoint | Whatever the endpoint uses | Phrase, source language, description, dictionary key, site and dictionary name, target languages |

- **When:** requests go from this app's server to the provider only when a
  user clicks Translate, one phrase per request.
- **Your key, your terms:** each organization uses its own provider account
  and API key, stored encrypted. The provider processes the request under
  that account and its API terms; the publisher does not store phrases or
  results and does not use them to train any model.
- **Human review:** results are put into the editor as plain text and are
  not saved until the user reviews them and clicks Save.
- **Transparency:** automatic translations can be wrong or culturally off.
  The app shows this notice in Settings and in the entry editor, says what
  each provider receives, and labels results as AI-generated or
  machine-translated.

The full disclosure (data, security, EU AI Act, GDPR/CCPA and human
oversight) is in the [AI usage disclosure](DATA-USAGE.md#ai-usage-disclosure),
and the rules for using the feature are in the [Terms of service](TERMS.md).

## Security and privacy

- **Authentication:** dictionary and settings operations run through the
  Marketplace SDK with the signed-in SitecoreAI user's own session and
  permissions. Every `/api/translate/*` route additionally requires a Sitecore
  Cloud access token, verified on the server (signature, issuer, audience,
  expiry and that it was issued to this app's client ID). The kit is
  described in
  [`src/lib/marketplace-auth/README.md`](src/lib/marketplace-auth/README.md).
  Without `NEXT_PUBLIC_AUTH0_CLIENT_ID`, the dictionary still works but
  translation is unavailable.
- **API keys:** the OpenAI, Anthropic and Google keys are
  encrypted by the server (AES-256-GCM, key derived from
  `DICTIONARY_SECRET_ENCRYPTION_KEY` with HKDF-SHA256) before they are stored
  in the `TranslationSettings` item, and decrypted only on the server when a
  provider is called. If the encryption key is not set, the app refuses to
  store keys rather than storing them in plaintext. Keys stored in plaintext
  by earlier versions are encrypted automatically the next time the app
  loads. If the encryption key changes or is lost, users must enter their API
  keys again. Anyone who can read the item sees only ciphertext. Keys are
  only ever sent to the fixed provider hosts (OpenAI, Anthropic, Google),
  never to a user-supplied URL, so a sealed key cannot be redirected.
- **Model output:** only string `languageCode` / `translation` pairs for
  the requested languages are passed back to the browser, and they are shown
  in text fields, never rendered as HTML.
- **Provider errors:** OpenAI and Anthropic error messages and status codes
  are logged on the server only; the browser gets a fixed message (rejected
  key, rate limit, rejected request or unavailable) with status 502.
- **Data leaving SitecoreAI:** dictionary content goes only to your SitecoreAI
  environment through the host, except when a user clicks Translate, which
  sends the data listed in [AI and machine translation](#ai-and-machine-translation)
  through this app's server to the chosen provider, under that provider's
  terms. The Google key is sent in the `X-Goog-Api-Key` header, never in the
  URL.
- **No third-party assets or analytics:** fonts (Inter, JetBrains Mono and
  Material Symbols) are bundled with the app and served from the deployment,
  so the page makes no requests to Google Fonts or any other third party.
  The app uses no analytics or tracking.
- **Security headers:** every response sets HSTS,
  `Content-Security-Policy: frame-ancestors` (only SitecoreAI may embed the
  app, configurable with `CSP_FRAME_ANCESTORS`), `X-Content-Type-Options`,
  `Referrer-Policy` and `Permissions-Policy`; `/api` responses are
  `Cache-Control: no-store`.
- **Audit log:** sign-in decisions, translation requests (`translate`:
  provider, outcome, phrase and character counts, target language codes)
  and API key sealing (`secret.seal`) are written as JSON audit lines with
  UTC timestamps to the server log. They never contain tokens, API keys,
  secrets, phrases or translations.
- **User-supplied URLs:** the custom endpoint URL must be a
  public http(s) address on port 80 or 443, with a host name (IP addresses
  are refused) and no credentials in the URL. The host must resolve only to
  public addresses: private, loopback, link-local, carrier-grade NAT,
  cloud-metadata and other reserved ranges are refused, and the check runs
  inside the connection's own DNS lookup, so the request goes to exactly the
  address that was checked. Redirects are not followed, and
  requests time out after 20 seconds. Upstream error bodies are not passed
  back to the browser.
- **Input limits:** each request carries one phrase of at most 5,000
  characters, a description of at most 2,000, context fields (site,
  dictionary and entry name, key) of at most 500 and at most 50 target
  languages; anything else is refused with a 400 error.
- **Rate limit:** each signed-in user can make 30 translation requests (and
  30 key-sealing requests) per minute; further requests get a 429 error.
- **Policies:** [Privacy policy](PRIVACY.md),
  [Terms of service](TERMS.md),
  [Data usage disclosure](DATA-USAGE.md) and
  [Security policy](SECURITY.md).

## Limitations

- Works with one environment at a time: the one the app was opened in.
- Search matches entry names only, not keys or phrases, and depends on the
  `sitecore_master_index` being up to date.
- **General** settings (key format, auto-format, deletion) are stored per
  browser, not shared between users. Hiding the delete column is a
  convenience, not a permission; use Sitecore security to prevent deletion.
- Assumes the dictionary root is `<site root>/Dictionary` and uses the
  standard Dictionary Folder and Dictionary Entry templates.
- Google Cloud Translation receives only the language part
  of each code (for example `fr` for `fr-FR`), so regional variants are not
  distinguished. Google Cloud Translation v3 is not supported directly; use a
  custom endpoint.
- Translation requires custom authorization to be set up on the deployment.
- The translation rate limit is kept in memory per server instance, so it is
  not shared between instances and resets when an instance restarts; it
  stops a runaway client, not a determined one. Provider quotas still apply.

## Development

- Next.js 15 (App Router), React 19, TypeScript.
- Tailwind CSS v4 and Radix UI primitives, with icons from Material Symbols
  (self-hosted from the `material-symbols` package) and `@mdi/js`. Inter
  and JetBrains Mono are self-hosted with `next/font`.
- Sitecore Marketplace SDK (`@sitecore-marketplace-sdk/client` 0.4 and
  `@sitecore-marketplace-sdk/xmc` 0.4).
- Server: Anthropic SDK, `jose` for token verification, `ipaddr.js` for the
  URL guard, `zod` for response validation.
- `npm run dev` starts the dev server on port 5002.

```
src/
  app/           Root layout, the single page (/) and /api/translate/* routes
  lib/           marketplace-auth kit, API key encryption
  utils/         GraphQL helpers, settings, key rules, translation providers,
                 URL guard, SDK hook
components/      Entry table, editor, dialogs, settings page, UI primitives
lib/             Icon and class-name helpers
docs/            Screenshots
```

## Support

Report bugs and request features in
[GitHub Issues](https://github.com/robertobarbedo/sitecoreai-marketplace-dictionary/issues).
Report security issues as described in the [Security policy](SECURITY.md).
This is a community app and is not an official Sitecore product.

See also the [Privacy policy](PRIVACY.md), [Terms of service](TERMS.md) and
[Data usage disclosure](DATA-USAGE.md).

## License

Licensed under the Apache License 2.0 — see [LICENSE](LICENSE)..
