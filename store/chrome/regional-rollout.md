# Localization and regional rollout review

## Broader language coverage review (11 November 2026)

Complete localization before choosing a regional rollout. No distribution settings have been changed by this work.

- `es` uses shared Spanish wording; prefer “Presiona” over “Pulsa”, “Orden inteligente” over “Ranking Inteligente”, and “direcciones web” over “URLs” in user-facing copy. The existing catalog can serve Spanish-speaking users across Spain and Latin America without duplicating identical country catalogs.
- `fr` uses shared French wording and consistent formal address. France, French-speaking Canada, Belgium, Switzerland and other Francophone audiences can share this catalog; country availability and language choice are separate decisions. Add a regional variant only when an actual terminology or behavior difference requires it.
- `en`, `zh_CN`, `zh_HK` and `zh_TW` retain their existing language coverage. A country's inclusion does not guarantee every language spoken there is supported.
- Command descriptions, popup document language/title, theme labels, shortcut help and analytics consent are localized. A regression check verifies catalog parity and referenced UI/manifest keys, including Safari shortcut guidance.
- Spanish and French store descriptions use the same terminology as the popup. Store copy remains a local draft until updated in the developer dashboard.

### Remaining release checks

1. Review actual popup layouts with long Spanish/French strings and each Chinese locale, including empty results, shortcut configuration and consent controls.
2. Prepare localized screenshots and verify live store descriptions match these drafts.
3. Provide understandable privacy-policy content for the target languages; the current policy is English only.
4. Choose the country list explicitly, package from the current release source, and verify saved distribution settings.

No new language (including Brazilian Portuguese), store submission or distribution change is included in this review.
