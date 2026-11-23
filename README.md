# BidWazi Africa

Kenya-first procurement discovery and supplier bid-workspace beta.

## Free static-first deployment

This first public beta uses Cloudflare Pages + Pages Functions and the public Kenya PPIP active-tender feed. It intentionally has no database, login, payment processing, paid API, email/SMS provider or AI dependency. Saved notices are stored locally in the visitor's browser.

## Deploy on Cloudflare Pages

- Connect this public GitHub repository: https://github.com/imaraonecbo/bidwazi-africa
- Framework preset: None
- Build command: leave blank
- Build output directory: public
- Root directory: /
- Cloudflare Pages detects the root functions/ directory and deploys /api/tenders as a Pages Function.
- Proposed project name: bidwazi-africa
- Expected URL: https://bidwazi-africa.pages.dev (only after successful deployment and DNS availability)

## API

GET /api/tenders?page=1 fetches the official PPIP feed, normalizes a limited set of notice fields, and returns cached JSON. It deliberately does not expose embedded creator/contact/ID fields from upstream records.

## Limitations

- PPIP is the source of truth. This is an unofficial independent discovery tool.
- The upstream endpoint is not treated as a stable, versioned public developer API. Monitor for schema changes.
- AGPO is shown only where the upstream record explicitly indicates an AGPO group/category.
- No account sync: browser-saved items remain on that device.
- No promise of tender eligibility, award, completeness or uninterrupted feed availability.

## Security

No secrets are needed for this beta. Keep future secrets in Cloudflare environment variables/secrets, never in public files or Git history. Before adding accounts, persistent customer data, paid access or email notifications, implement and test authentication, authorization, rate limits, privacy notices, retention and incident procedures.
