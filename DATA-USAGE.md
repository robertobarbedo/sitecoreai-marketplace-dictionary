# Data usage disclosure

Dictionary Editor runs inside SitecoreAI and lets content authors browse,
edit, translate and publish a site's dictionary entries. Dictionary content
is read and written through the Sitecore Marketplace SDK with the signed-in
user's own permissions, and the app's settings are stored as items in the
customer's own SitecoreAI environment. The app has no database of its own
and uses no analytics. The app's server is used only when a user asks for a
translation: it forwards the phrase to the translation provider the customer
configured, using the customer's own API key. Hosting: Vercel; serverless
functions run in the United States (Vercel default region `iad1`,
Washington, D.C.) unless the deployment sets another region.

See also the [Privacy policy](PRIVACY.md), [Terms of service](TERMS.md) and
[Security policy](SECURITY.md).

| Data type | Source | Purpose | Retention | Storage region | Access | Protection | Your rights (DSAR) | Deletion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dictionary content (entry names, keys, phrases in each language, descriptions, folders) and site metadata (site list, root paths, languages) | Your SitecoreAI environment: Authoring and Management GraphQL API (`master` database), via the Marketplace SDK | Show, search, create, edit, delete and publish dictionary entries | Not stored by the app; edits are saved to your environment, where your normal Sitecore retention applies | Your SitecoreAI environment's region | The signed-in user, limited by their own SitecoreAI permissions | In transit: TLS 1.2+ and HSTS; requests go through the SitecoreAI host with the user's session | Governed by your Sitecore agreement; the publisher holds no copy | Delete entries in the app or in Sitecore (they go to the recycle bin) |
| Translation request (one phrase, its source language, description, entry name, dictionary key, site and dictionary name, target language codes; Google receives only the phrase and language codes) | The entry editor, sent by the browser to the app's `/api/translate/*` route when the user clicks Translate | Get translation suggestions from the configured provider | Not stored by the app; held in server memory for the duration of the request. The provider's retention applies under its API terms | Processed in the Vercel function region (default `iad1`, US), then by the provider (see [AI usage](#ai-usage-disclosure)) | The app's server for the duration of the request; the chosen provider | TLS 1.2+ and HSTS; signed-in route (token verified); input capped (one phrase of 5,000 characters, 2,000-character description, 50 target languages); per-user rate limit | Email rb205@proton.me; the publisher holds nothing beyond logs. For data held by the provider, use the provider's own process under your account | Not retained by the app |
| Translation results (suggested phrase per language) | The provider's response, returned through the app's server | Fill in the entry editor for the user to review | Not stored by the app; kept in the editor until the user saves or discards it | Browser memory; saved results go to your SitecoreAI environment's region | The signed-in user | Passed through as plain text only (never rendered as HTML); nothing is saved without the user clicking Save | Governed by your Sitecore agreement once saved | Discard in the editor, or edit / delete the entry |
| Language settings per site (base language, available languages) | Entered by the user in Settings | Choose the languages shown in the table and editor | Until changed or deleted | Your SitecoreAI environment's region, item `/sitecore/system/Modules/Marketplace/DictionaryEditor/<site>/Settings` | Users with read access to that item | Governed by your Sitecore agreement and Sitecore security | Governed by your Sitecore agreement | Delete the item, or the `/sitecore/system/Modules/Marketplace/DictionaryEditor` folder (and the legacy `/sitecore/system/Modules/DictionaryEditor` folder, if present) |
| Translation settings (provider, model names, custom endpoint URL) and translation provider API keys (OpenAI, Anthropic, Google) | Entered by the user in Settings › Translations | Call the chosen provider | Until changed or deleted | Your SitecoreAI environment's region, item `/sitecore/system/Modules/Marketplace/DictionaryEditor/TranslationSettings` | Users with read access to that item see the settings; API keys only as ciphertext | API keys sealed with AES-256-GCM by the app's server (key from the deployment secret `DICTIONARY_SECRET_ENCRYPTION_KEY`) and decrypted only on the server for a provider call; never logged or returned to the browser in plaintext | Governed by your Sitecore agreement | Delete the item or the module folder above; remove the key in Settings; revoke the key with the provider |
| Server audit and runtime logs (UTC time, API path, event `auth` / `translate` / `secret.seal`, outcome, HTTP status, Sitecore user ID `sub`, organization ID, denial reason, provider name, phrase count, character count, target language codes, number of sealed fields; provider error codes; hosting request metadata such as IP address) | Generated by the app's API routes and the hosting provider | Security auditing, abuse prevention, troubleshooting | 90 days in the publisher's log store | Vercel (US) and the publisher's log store | The publisher (app maintainer) and the hosting provider | In transit: TLS 1.2+; at rest: provider encryption; contain no content (phrases, translations), tokens, secrets or API keys | Email rb205@proton.me, answered within 30 days | Automatic after 90 days, or sooner on a verified request |
| Sitecore Cloud sign-in tokens (Auth0 access and refresh tokens) and current organization ID | Sitecore Cloud sign-in (`auth.sitecorecloud.io`) | Prove the user is signed in when calling `/api/translate/*`; renew the session | Until sign-out, token expiry, or organization switch | Browser `localStorage` on the user's device | The user's browser; the access token is sent only to the app's server, the refresh token only to Sitecore | Tokens verified server-side (RS256 signature, issuer, audience, expiry, client ID); never logged | Held only on your device; the publisher keeps no copy | Cleared on sign-out / expiry or by clearing site data for the app |
| General preferences (key format, auto-format, hide delete) and the selected site name | Entered by the user in the app | Remember preferences in this browser | Preferences until site data is cleared; the `dictionary_selected_site` cookie for one year | Browser `localStorage` and a first-party cookie on the user's device | The user's browser only | Stays on the device; the cookie is not used by the server | Held only on your device | Clear site data for the app |

## AI usage disclosure

### Features

Dictionary Editor has one AI feature: **translation suggestions** for
dictionary phrases. In the entry editor, a user can click **Translate** next
to a language, or **Translate All Missing**, to fill in phrases from the base
language. The feature is optional and off until a provider is configured in
**Settings › Translations**.

| Provider | Type | Model | Data sent |
| --- | --- | --- | --- |
| OpenAI (Chat Completions API) | Generative AI (large language model) | Configurable; default `gpt-5-nano` | Phrase, source language, description, entry name, dictionary key, site and dictionary name, target language codes |
| Anthropic (Messages API) | Generative AI (large language model) | Configurable; default `claude-opus-5-5`. For some models, if Anthropic's safety classifier declines a request, Anthropic retries it on its recommended model (server-side fallback) | Phrase, source language, description, entry name, dictionary key, site and dictionary name, target language codes |
| Google Cloud Translation (Basic, v2) | Machine translation (neural, non-generative) | Google's standard translation model | Phrase, source and target language (language part only, e.g. `fr`) |
| Custom endpoint | Chosen by the customer; may be AI or machine translation | Chosen by the customer | Phrase, source language, description, dictionary key, site and dictionary name, target language codes, sent to the URL the customer enters |

### Data and security

- Only the fields listed above are sent, and only when a user clicks
  Translate. No other content, user identity, tokens or Sitecore credentials
  are sent to the provider.
- The customer brings their own provider account and API key. Requests are
  made with that key, so the provider processes the data under the
  customer's own agreement and the provider's API terms. Under their
  standard API terms, OpenAI and Anthropic do not use API data to train
  their models by default, and Google does not use Cloud Translation content
  to train its models; check the current terms for your account:
  [OpenAI](https://openai.com/enterprise-privacy/),
  [Anthropic](https://www.anthropic.com/legal/commercial-terms),
  [Google Cloud Translation](https://cloud.google.com/translate/data-usage).
  Providers may keep requests for a limited time (for example for abuse
  monitoring) under those terms.
- The publisher does not train, fine-tune or evaluate any model with your
  data, and does not store the phrases or the results.
- API keys are sealed with AES-256-GCM on the app's server before they are
  stored, are decrypted only on the server for a provider call, and are only
  ever sent to the fixed provider hosts. They are never logged.
- Model output is treated as plain text: only string `languageCode` /
  `translation` pairs for the requested languages are passed back, and they
  are shown in text fields, never rendered as HTML.
- Dictionary phrases are short interface texts and are not expected to
  contain personal data. Don't put personal or confidential data in phrases
  or descriptions you send for translation.
- **Accuracy and bias:** automatic translations can be wrong, miss context,
  use the wrong tone or register, or be culturally inappropriate for the
  audience. The app shows this notice in Settings and in the entry editor.
  Review every suggestion before saving it.

### Regulations

- **EU AI Act:** the feature is a limited-risk use (text generation to
  assist a human editor). To meet its transparency obligations, results are
  labelled in the editor as **AI-generated** (OpenAI, Anthropic) or
  **Machine-translated** (Google, custom endpoint), and the settings page
  says what each provider receives.
- **GDPR / CCPA:** dictionary phrases are not expected to contain personal
  data. Where they do, the customer is the controller, the chosen provider
  processes the data under the customer's own agreement with it, and the
  publisher's app server only passes the request through without storing
  it. See [Your rights](PRIVACY.md#your-rights) for requests to the
  publisher.

### Human oversight

Nothing produced by a provider is saved automatically. Translation results
are put into the entry editor's text fields; they are written to Sitecore
only when the user reviews them and clicks **Save** (or chooses to save when
leaving with unsaved changes). The user can edit or discard every
suggestion, and publishing is a separate, explicit action.
