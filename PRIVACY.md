# Privacy Policy

**Last updated: 2026-10-31**

## Overview

This policy explains what data the Dictionary Editor ("the app") handles,
where it goes, what is stored, and how you can exercise your rights. It
applies to the hosted app listed in the Sitecore Marketplace.

## Summary

- The app has no database. Dictionary content stays in your SitecoreAI
  environment, and the app's settings are stored as items in that
  environment, not on the app's servers.
- The app uses no analytics, tracking or advertising services.
- When you click **Translate**, the phrase and its context are sent through
  the app's server to the translation provider your organization configured
  (OpenAI, Anthropic, Google Cloud Translation or your own endpoint), using
  your organization's own API key. The app does not store them.
- The only data kept on the server side are short audit and runtime log
  lines (who called the API, the outcome, the provider, and counts such as
  the number of characters translated), retained for 90 days.

## How the app works

The app runs inside SitecoreAI. It reads and writes your dictionary through
the Sitecore Marketplace SDK, which calls the Sitecore Authoring and
Management GraphQL API with your own SitecoreAI permissions. Those results
are processed in your browser and are not sent to the app's servers. The
one exception is translation, described below.

## What data the app handles

- **Dictionary content and site metadata** (entry names, keys, phrases,
  descriptions, folders, site names, languages): read from and written to
  your environment, shown in your browser.
- **Translation requests**: the phrase being translated, its source
  language, description, entry name, dictionary key, site and dictionary
  name and the target languages, sent to the app's server when you click
  Translate.
- **Settings**: language settings per site, and the translation provider,
  model names, endpoint URLs and API keys (stored encrypted), saved in your
  environment.
- **Account identifiers**: your Sitecore Cloud user ID (the token's `sub`)
  and organization ID, taken from the access token when you use
  translation or save an API key.
- **Sign-in tokens**: your Sitecore Cloud access and refresh tokens, kept in
  your browser.
- **Preferences**: key format, auto-format and delete-column settings, and
  the last selected site, kept in your browser.

## Where data goes

1. **Sitecore.** Dictionary and settings reads and writes, and publishing,
   made through the Marketplace SDK, and sign-in requests to Sitecore Cloud
   (see [Sign-in](#sign-in)).
2. **The app's own server (translation).** When you click Translate, the
   browser sends the translation request, the encrypted API key and your
   Sitecore Cloud access token (which proves you are signed in) to the
   app's `/api/translate/<provider>` route. The server decrypts the key,
   calls the provider and returns only the translated text. It does not
   store the request, the key or the result.
3. **The translation provider.** The provider your organization chose
   receives the fields listed in the
   [Data usage disclosure](DATA-USAGE.md#ai-usage-disclosure) (Google
   receives only the phrase and language codes). It processes them under
   your organization's own account and the provider's terms.
4. **The app's own server (saving API keys).** When you save an API key in
   Settings, the browser sends it to `/api/translate/seal`, which returns
   it encrypted. Only the encrypted value is stored in your environment.

The app does not sell or share data with anyone else.

## What is stored and where

| Data | Where | Retention |
| --- | --- | --- |
| Dictionary entries you create or edit | Your SitecoreAI environment | Under your normal Sitecore retention |
| Language settings per site | Your SitecoreAI environment, `/sitecore/system/Modules/Marketplace/DictionaryEditor/<site>/Settings` | Until you change or delete them |
| Translation settings and encrypted API keys | Your SitecoreAI environment, `/sitecore/system/Modules/Marketplace/DictionaryEditor/TranslationSettings` | Until you change or delete them |
| Audit log lines: time (UTC), API path, event (`auth`, `translate`, `secret.seal`), outcome, HTTP status, Sitecore user ID, organization ID, denial reason, provider name, phrase and character counts, target language codes, number of keys sealed | The publisher's server logs (Vercel runtime logs and the publisher's log store) | 90 days |
| Standard request metadata recorded by the hosting provider (IP address, time, path, user agent) | Vercel | 90 days at most |
| Sign-in tokens and current organization ID | Your browser's `localStorage` | Until you sign out, the session expires, or you clear site data |
| Preferences (key format, auto-format, delete column) | Your browser's `localStorage` | Until you clear site data |
| Last selected site | A first-party cookie, `dictionary_selected_site` | One year |

Log lines never contain tokens, API keys, secrets, phrases or translations.
Settings stored in your environment are governed by your agreement with
Sitecore.

## Who can access it

- **Server logs:** only the app's maintainer, for operating, securing and
  troubleshooting the app, and the hosting provider as a sub-processor.
- **Settings items:** users in your organization with read access to them,
  under your Sitecore security. API keys are stored only as ciphertext that
  only the app's server can decrypt.
- **Browser storage:** only you, on your own device.
- **Translation requests:** the app's server for the duration of the
  request, and the provider your organization chose.

## How data is protected

- All traffic uses HTTPS (TLS 1.2 or later) with HSTS.
- The translation API verifies every Sitecore Cloud access token
  (signature, issuer, audience, expiry and that it was issued to this app)
  before acting, and limits how many requests each user can make per
  minute.
- API keys are encrypted with AES-256-GCM before they are stored, are
  decrypted only on the server, and are only sent to the fixed provider
  hosts.
- A custom endpoint URL must be a public `http`/`https` address on ports 80
  or 443; private and internal networks are blocked.
- Security headers restrict which sites may embed the app.
- Logs are stored with the hosting provider's encryption at rest.

## Sign-in

Translation requires you to sign in with your Sitecore Cloud account
(Sitecore's Auth0 tenant at `auth.sitecorecloud.io`). The sign-in is handled
by Sitecore. The app only receives the resulting access and refresh
tokens; the browser sends the refresh token back to Sitecore's sign-in
service to renew your session.

## Local storage and cookies

The app uses your browser's local storage for:

- General preferences (key format, auto-format, delete column)
- Sign-in tokens (access and refresh tokens) and the current organization ID,
  so you stay signed in. The organization ID is kept so that switching
  organization forces a new sign-in.

It also sets one first-party cookie, `dictionary_selected_site`, holding the
name of the last selected site. The server does not use it.

This data stays on your device. The access token is sent only to the app's
own server, and the refresh token only to Sitecore's sign-in service. You
can clear all of it by clearing your browser data for the app.

## Sub-processors and third parties

- **Vercel Inc.** (hosting). Serverless functions run in the United States
  (region `iad1`, Washington, D.C.) unless a deployment sets another region.
  See https://vercel.com/legal/privacy-policy.
- **Sitecore** (sign-in and the SitecoreAI APIs), under your own agreement
  with Sitecore.
- **The translation provider your organization configures**, only when a
  user clicks Translate, under your organization's own account and the
  provider's terms:
  - OpenAI: https://openai.com/policies/privacy-policy/
  - Anthropic: https://www.anthropic.com/legal/privacy
  - Google Cloud Translation: https://cloud.google.com/terms/cloud-privacy-notice
  - A custom endpoint: whoever operates the URL you enter.

No analytics, tracking or advertising services are used.

## Your rights

Depending on where you live (for example under the GDPR or CCPA), you may
have the right to access, correct, delete, restrict or object to the
processing of your personal data, and to receive a copy of it.

To make a request, email rb205@proton.me with the subject "Data request".
Include your Sitecore Cloud organization ID and, if you know it, your user
ID, so we can find the matching log lines. We answer within 30 days. The
only personal data the publisher holds is in the server logs described
above. Data stored in your SitecoreAI environment is controlled by your
organization, and data held by a translation provider is handled under your
organization's account with that provider. You can also complain to your
local data protection authority.

## Deletion

- **Server logs** are deleted automatically after 90 days. On a verified
  request we delete matching log lines sooner where the log store allows it.
- **Settings** are deleted by deleting the
  `/sitecore/system/Modules/Marketplace/DictionaryEditor` folder (and the
  legacy `/sitecore/system/Modules/DictionaryEditor` folder, if present) in
  your environment. Uninstalling the app does not remove it.
- **API keys** are removed in Settings › Translations or by deleting the
  `TranslationSettings` item; you can also revoke them with the provider.
- **Browser data** is deleted when you sign out or clear site data for the
  app.

## Changes to this policy

We may update this policy from time to time. Changes are published in this
file and reflected in the "Last updated" date at the top.

## Contact

Questions about this policy: email rb205@proton.me or open an issue at
https://github.com/robertobarbedo/sitecoreai-marketplace-dictionary/issues.
