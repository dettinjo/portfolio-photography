[English](README.md) · [Deutsch](README.de.md)

# Photography Portfolio & Client Portal

A production-grade photography portfolio built with Next.js and Strapi, featuring a password-protected client dashboard for photo proofing and approvals, fully i18n (EN/DE).

<p align="center">
  <img src="docs/nextjs.svg" alt="Nextjs" width="170" />
</p>

### Key Features

- **Headless CMS Architecture**: Strapi v5 powers all content — photo collections, client data, and gallery metadata — decoupled from the Next.js frontend for flexible content management.
- **Client Proofing System**: Clients receive a unique access link to a private dashboard where they can review their gallery, mark favourite shots, and request edits — replacing expensive dedicated software.
- **Internationalization (i18n)**: Full English and German language support using `next-intl`, with content managed directly in Strapi.
- **Dynamic Gallery**: Masonry-layout galleries with lazy loading, lightbox viewer, and optimized image delivery via Next.js Image.
- **Responsive & Animated**: Framer Motion page transitions and scroll animations provide a premium user experience across all devices.
- **Dockerized Deployment**: Both the Next.js frontend and Strapi backend are containerized with Docker Compose for a consistent, one-command deployment via Coolify.

### Technical Highlights

The authentication system for the client portal is built on JWT tokens stored in HTTP-only cookies, ensuring secure, session-based access without exposing credentials. The Strapi content model separates public photography collections from private client galleries, using role-based access control to ensure clients only see their own content.
