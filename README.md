[English](README.md) · [Deutsch](README.de.md)

# Photography Portfolio & Client Portal

A production-grade photography portfolio built with Next.js and an embedded Payload CMS, with photos synced from Nextcloud and token-based client proofing — fully i18n (EN/DE).

<p align="center">
  <img src="docs/nextjs.svg" alt="Nextjs" width="170" />
</p>

### Key Features

- **Nextcloud as the photo source**: Lightroom exports dropped into a Nextcloud folder appear on the site automatically; photos are proxied, resized and cached as WebP so credentials never reach the browser.
- **Embedded Payload CMS**: Payload 3 runs inside the Next.js app (admin at `/admin`) on PostgreSQL and manages client albums, approvals and reviews.
- **Client Proofing**: Clients get a private approval link, select and comment on photos and grant publication consent — no account needed.
- **Reviews**: Clients can leave a rated testimonial; it appears on the site once approved in the admin panel.
- **Internationalization (i18n)**: English and German via `next-intl`.
- **Dockerized Deployment**: One container plus PostgreSQL, built on GitHub Actions and deployed via Coolify; database migrations run automatically on startup.

### Technical Highlights

All CMS access happens server-side through Payload's Local API. Album data is admin-only; clients reach their album solely through token-scoped endpoints that return the fields the approval UI needs. Public forms are protected by input validation, a honeypot and per-IP rate limiting, and the image proxy only serves images below the portfolio folder.
