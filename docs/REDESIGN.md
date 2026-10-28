# Redesign Plan — Photography Portfolio & Client Platform

Status: **decisions recorded** · Date: 2026-10-26 (decisions §14 added the same day)

This document is the reference for the redesign of `photosby.joeldettinger.de`. It records
what the current codebase does (and where it breaks), the decisions taken, the target
architecture, and a phased roadmap. Each phase is meant to ship on its own.

---

## 1. Goals

1. **The pictures are the product.** The public site presents the work first; interface,
   text and personal information step back.
2. **Packages stay, but softer.** Visitors can see and choose ways to work together without
   a pricing-table sales pitch.
3. **Contact is always one tap away.**
4. **Personal information exists** (about, approach, FAQ) but is not a large header on top.
5. **Nextcloud is the saving side.** Finished edits are exported from Lightroom into
   Nextcloud and appear on the site automatically — for the portfolio, client previews and
   hi-res delivery. The website ingests, processes and serves them itself; it never
   redirects to Nextcloud.
6. **Rich backend.** Payload admin plus a lightweight mobile "studio" for quick uploads,
   replies and status changes.
7. **Installable PWA** for visitors, clients and the photographer.
8. **The client interface covers the whole workflow** — inquiry to delivery and review.
9. **Feedback is part of every step**, not two isolated forms.

---

## 2. Current state (audit)

Stack: Next.js 15 (App Router) · Payload 3 embedded in the same app · Postgres 17 ·
next-intl (en/de) · Tailwind + shadcn/ui · Docker image on GHCR, deployed by Coolify.
Portfolio photos are read from Nextcloud (`Lightroom/Portfolio/<album>`) via WebDAV and
proxied through a sharp → WebP route. Payload holds approval albums and reviews.

### 2.1 Broken in production (verified 2026-10-26)

| Symptom | Cause |
|---|---|
| Testimonials always empty | `src/lib/payload.ts` fetches `NEXT_PUBLIC_CMS_URL` = `https://cms.joeldettinger.de`, which no longer resolves. Payload is embedded now. |
| `/approve/<token>` always 404 | Same — `fetchAlbumByToken()` calls the dead host. |
| Review submission fails | Same, plus `src/app/api/reviews/route.ts` (POST only) shadows Payload's REST collection → `GET /api/reviews` returns 405. |
| `/dashboard` dead end | Redirects to `cms.joeldettinger.de/admin`. |
| Register/login unusable for clients | `Users` has default access (anonymous create denied); and it is the *admin* collection, so a client account would be an admin. |
| Services tab invisible | `NEXT_PUBLIC_SHOW_SERVICES` not set at build. |
| Not a PWA | No manifest (404), no service worker (although `next.config.ts` sets headers for `/sw.js`). |

The live site has one album ("Formula 1", 31 images); the approval collection is empty, so
the client workflow has never been used in production.

### 2.2 Security

- `Albums.access.read: () => true` → `GET /api/albums` exposes `approvalToken` and
  `clientEmail` of every album.
- `Reviews.access.create: () => true` and `/api/contact` have no rate limit, captcha or
  honeypot.
- `name`, `message`, `quote` are interpolated unescaped into HTML emails
  (`src/app/api/contact/route.ts`, `src/lib/email-payload.ts`).
- `PAYLOAD_SECRET` falls back to `'change-me-in-production'`.
- Auth JWT kept in `localStorage` (`src/context/AuthContext.tsx`).
- `db.push: true` auto-mutates the production schema on boot.
- `/api/approve` writes `publicationConsent`, a field that does not exist on `Albums`.

### 2.3 Structural

- **Two sources of truth**: images in Nextcloud, workflow in Payload, joined only by a
  slug that must match a folder name; selections stored as bare filenames.
- **Images**: every page load re-PROPFINDs the tree (N+1 per album); `fetchAlbumBySlug`
  loads all albums; every image is declared 1920×1280 although the only album is
  1536×2048 portrait (wrong aspect ratio, layout shift); no EXIF, alt text or blur
  placeholder; visitors' requests reach the home server on every cache miss; "download"
  serves the 1920 px WebP preview, not the original.
- **Layout**: profile header + avatar first, Instagram-style icon tabs; grid crops to
  4:5; photos framed with `rounded-xl border-2 border-foreground`.
- **Packages**: pricing cards + calculator ending in a `mailto:` — inquiries are not stored.
- **Feedback**: approval (select + comment) and a public star-rating form are unrelated.
- **Dead weight**: `src/lib/strapi.ts`, Google OAuth callback, register page, `next-auth`,
  `@vercel/analytics` / `speed-insights` (self-hosted), `react-google-recaptcha-v3`,
  `@strapi/blocks-react-renderer`, Tailwind 3 *and* 4 installed, `Readme.md` next to
  `README.md`, READMEs describing Strapi / Next 14.
- **SEO**: `de` hreflang is `de.<domain>` on the home page but `/<locale>` in the layout.

### 2.4 Nextcloud facts

- `cloud.joeldettinger.de`, Nextcloud 34, `webhook_listeners` enabled, background jobs
  via cron.
- `Lightroom/` contains `Portfolio/Formula 1` (31 JPG), empty `Exports/` and `RAW/`.
- Current exports: 1536×2048, Lightroom Classic, EXIF kept — fine for the web, too small
  for final delivery.

---

## 3. Design principles

- **Photo first, chrome last.** Edge-to-edge images in their native aspect ratio, no
  borders or rounded corners on photographs, controls appear on hover/tap.
- **Minimal, but playful — not another Helvetica portfolio.** Warm paper and ink with one
  signal colour (a camera's REC orange). Type: *Bricolage Grotesque* (squeezed to its
  narrowest, heaviest cut for display), *Instrument Serif italic* for a single accent word
  per headline, *JetBrains Mono* for camera-style readouts. Playful details come from the
  camera: the hero as a viewfinder with the photo's real exposure readout and a blinking
  REC, viewfinder corners and frame numbers on hover, series as slightly tilted prints, a
  shutter blink when a photo opens, numbered section labels. Viewer and photo pages are
  always dark; all motion respects reduced-motion.
- **One next action.** Every client screen states what happens next and who acts.
- **Feedback is attached to things** (a photo, a region, a gallery, a stage), never
  free-floating.
- **Nextcloud is write-only for the photographer, invisible to everyone else.**
- **Nothing on the public path depends on the home server being up.**

---

## 4. Target architecture

```
 Lightroom Classic (Mac)
   │  Hard Drive Publish Services → synced Nextcloud folder
   ▼
 Nextcloud (home server) ── webhook (NodeCreated/Written/Deleted/Renamed) ──┐
   ▲                                                                      │
   │ WebDAV (read files, write selection.txt, MKCOL project folders)       ▼
 ┌──────────────────────── Next.js + Payload (Coolify) ────────────────────────┐
 │  /api/nextcloud/webhook → debounce → Payload Jobs Queue                     │
 │      ingest: download · EXIF · orient · sRGB · strip GPS · derivatives       │
 │      reconcile (15 min): PROPFIND fileid/etag diff                          │
 │  Payload collections (Postgres)        Media storage (storage box mount)     │
 │  Public site · Client portal · /studio · Payload admin · Service worker     │
 └─────────────────────────────────────────────────────────────────────────────┘
```

- **Payload is the single source of truth** for every photo, gallery and project.
- **Nextcloud is the ingest channel.** A photo's identity is its Nextcloud `fileid`
  (stable across renames/moves); its version is the `etag`.
- **All server code uses the Payload Local API** (`getPayload`) — no HTTP calls to itself.

---

## 5. Nextcloud ingest

### 5.1 Folder convention

```
Lightroom/
├─ Portfolio/
│  ├─ Formula 1/                  → public series "Formula 1"
│  └─ _Weddings 2027/             → leading "_" = draft (admin only)
├─ Clients/
│  └─ 2026-11-14 mueller-wedding/ ← created by the site when a project is created
│     ├─ 1 Preview/               → sneak peek & proofing gallery
│     ├─ 2 Final/                 → full-resolution delivery
│     └─ _from-client/            ← site writes the client's selection back here
├─ RAW/                           → ignored
└─ Exports/                       → ignored
```

Unknown folders under `Clients/` create a project stub in the admin inbox instead of
failing silently.

### 5.2 Lightroom setup

Use **Hard Drive Publish Services** (one per purpose: *Portfolio*, *Client Preview*,
*Client Final*) targeting the locally synced Nextcloud folder; collections become
subfolders. Re-publishing an edited photo overwrites the same filename — the site treats
that as a new **version**.

| Purpose | Suggested export |
|---|---|
| Portfolio | JPEG, sRGB, long edge 3000 px, quality 85, keep copyright + IPTC, strip location |
| Client Preview | JPEG, sRGB, long edge 2048 px, quality 80 |
| Client Final | JPEG, sRGB, full resolution, quality 95 (optional TIFF collection) |

Lightroom metadata drives the site:

| Lightroom | Site |
|---|---|
| IPTC Title / Caption | title / caption / alt text |
| Keywords | genre and tags |
| ★★★★★ | featured; first 5-star = series cover |
| Capture time | default order (overridable in admin) |

### 5.3 Sync

1. **Webhook** from `webhook_listeners` for `NodeCreatedEvent`, `NodeWrittenEvent`,
   `NodeDeletedEvent`, `NodeRenamedEvent`, filtered to `/<sync-user>/files/Lightroom/`,
   sent to `POST /api/nextcloud/webhook` with a shared-secret header. Delivery runs via
   Nextcloud background jobs (≤ 5 min with cron); a dedicated webhook worker can make it
   near-instant.
2. **Debounce** per folder: process once the folder has been quiet for ~60 s (the
   desktop client uploads file by file).
3. **Reconcile** every 15 min: PROPFIND `fileid`, `getetag`, `getcontentlength`,
   `getlastmodified`; diff against Payload. Lost webhooks never mean missing photos.
4. **Deletes** are soft: a photo with selections or comments is hidden, never erased.

### 5.4 Processing per purpose (Payload Jobs Queue)

| Purpose | Processing | Storage / delivery |
|---|---|---|
| Portfolio | EXIF read, auto-orient, sRGB, strip GPS; AVIF + WebP at 480/960/1600/2400; thumbhash + dominant colour | Site storage; public, immutable cache headers |
| Preview | ~2048 px WebP; subtle watermark (see below); original filename kept | Signed, expiring URLs scoped to project or share link |
| Final | Original **mirrored** to storage box; web-size set for social; ZIP built async; never watermarked | Signed download URLs in the portal; online 12 months, then purged (see below) |

Finals are mirrored rather than streamed from home so delivery does not depend on the
home server's uptime or upload bandwidth.

**Preview watermark (decision D4).** Every proofing/sneak-peek derivative carries a
subtle, semi-transparent text overlay in a corner — the **client's name** by default,
overridable per project in admin. It is burned in at ingest, so the un-watermarked preview
never exists on the site. Finals are never watermarked.

**Final gallery lifetime (decision D5).** Finals stay online for **12 months** from
delivery. Clients get reminder emails 30 and 7 days before expiry; the admin can extend a
gallery. On expiry the mirrored originals, web-size set and ZIP are deleted from the
storage box; the project, picks, comments and reviews remain. The originals still exist in
`Clients/<project>/2 Final/`, so re-ingesting restores a gallery.

Storage estimate: a wedding (~500 finals × ~15 MB + ZIP) ≈ 15 GB, a portrait/event
≈ 1–3 GB. The 1 TB storage box (926 GB free on 2026-10-26) holds roughly 50–60 weddings
within one 12-month window.

### 5.5 Credentials

- Dedicated Nextcloud user `portfolio-sync` with `Lightroom/` shared to it (read; write on
  `Clients/` for MKCOL and `_from-client/`), authenticated by app password.
- `NEXTCLOUD_*` and the webhook secret live in Infisical and Coolify env — never in the
  repo or the client bundle.

---

## 6. Public site

```
/                  full-bleed opening image → justified photo stream (native ratios),
                   genre filter chips, one-line "about" + link at the end
/work/[series]     editorial series page: story, mixed sizes, client quote beside photos
/p/[photo]         permalink: fullscreen viewer (swipe, pinch, keyboard), info drawer
                   (EXIF, series), "book a shoot like this"
/sessions          "Ways to work together" (replaces packages)
/about             portrait, story, approach, how a shoot runs, gear, FAQ
/contact           short form + direct channels; also a sheet from any page
/kind-words        reviews, each with the photo the client chose
/imprint, /privacy
```

- **Navigation**: small wordmark + Work · Sessions · About · Contact. In standalone PWA mode
  on mobile a bottom tab bar replaces the top links. Client entry: "My gallery".
- **Sessions**: each offering opens with photos from its genre, then how the day runs,
  what you receive, turnaround, and a small "from €…". The calculator becomes
  **Plan your shoot** — a short stepper (what, when, where, size, budget range) that
  creates an `Inquiry`.
- **Focused launch (decision D1)**: start with the 2–3 genres that have strong published
  series, plus a "Something else? Ask me" path in Plan your shoot. **Rule enforced by the
  site:** an offering (and its genre chip) is only shown when its genre has at least one
  published series. New genres appear automatically once a series is published.

#### Launch offerings

Prices are derived from the existing calculator rates (session €40, €55/h, €4 / €8 / €15
per image by retouch level, €0.50/km, express ×1.2) with a small bundle discount, and keep
the current Standard (€120) and Advanced (€380) price points. All values are `Offerings`
records, editable in admin.

| Offering | For | Includes | From | Extra image | Revisions | Deposit | Delivery |
|---|---|---|---|---|---|---|---|
| **Portraits** | people, couples, personal branding | 1 h, 1 location, consultation, proofing of all previews, **10** edited images (basic retouch) | **€120** | €8 | 1 round | 30 % | 7 days |
| **Events & Motorsport** | live events, races, corporate events | up to 3 h coverage, sneak peek (10 images within 48 h), **30** edited images | **€290** | €6 | 1 round | 30 % | 7 days |
| **Cars & Brands** | automotive, products, brand content | up to 3 h, up to 2 locations, **30** edited images (advanced retouch), web & social usage licence | **€380** | €12 | 2 rounds | 50 % | 10 days |

Add-ons (all offerings): express delivery within 48 h (+20 %), extra hour (€55), travel
(€0.50/km).

Prepared but hidden by the series rule: **Weddings** (price set once a wedding series is
published). **Landscapes** stay portfolio-only and are not sold as a session.

At launch only *Events & Motorsport* is visible (backed by *Formula 1*). Publishing one
portrait series and one cars/brands series before the Phase 2 release makes all three
appear.
- **Viewer**: one shared fullscreen component for portfolio, proofing and delivery.
- **SEO**: OG image per photo and series, `ImageGallery` / `ImageObject` JSON-LD with real
  dimensions, consistent `/<locale>` hreflang, sitemap from Payload.

---

## 7. Client portal

### 7.1 Lifecycle

```
Inquiry → Proposal → Booked → Planning → Shoot → Sneak peek → Proofing
        → Editing → Revisions → Delivery → Feedback → Archive
```

Stages advance from admin actions **and** from Nextcloud events (first file in
`1 Preview/` → Sneak peek/Proofing; first file in `2 Final/` → Delivery).

### 7.2 Access

- `Clients` is its own Payload auth collection (separate from admin `Users`) with
  **passwordless magic-link** login; session in an HTTP-only cookie.
- **Share links** per gallery: role (viewer / picker), optional PIN, expiry, download
  permission — e.g. a view-only guest link for wedding guests.

### 7.3 Screens (`/c`, `/c/[project]`)

- **Overview**: timeline, current stage, the one next action, key dates.
- **Plan**: questionnaire, moodboard uploads, shot list, location, schedule.
- **Galleries**:
  - *Proofing*: fullscreen swipe, favourite, 2-up compare, filters
    (all / picked / unpicked / commented), quota from the offering, paid extra images
    above the quota, multiple pickers with a merged view, offline-safe picks.
  - *Region comments*: a comment can pin an x/y point on the photo — this becomes the
    edit list.
  - *Revisions*: re-published photo → v2 with before/after slider → approve / request
    change; round limit from the offering.
  - *Delivery*: originals + web-size, async ZIP, expiry date, guest share.
- **Messages**: one thread per project, showing linked photo comments inline.
- **Documents**: proposal / confirmation (accepted with timestamp), Stripe receipts,
  uploaded invoice PDFs.
- **Payments**: see §7.5.
- **Feedback**: see §8.

### 7.4 Lightroom round trip

On submission the site writes `Clients/<project>/_from-client/selection.txt` (filenames
ready for the Lightroom Library filter + comments) and a CSV with ratings/labels. It syncs
to the Mac automatically.

### 7.5 Payments — Stripe (decision D2)

Payments run through **Stripe Checkout**, created server-side by the site; card data never
touches our server.

| Payment | Trigger | Effect when paid |
|---|---|---|
| Deposit | Client accepts the proposal | Project → **Booked**; date is held |
| Balance | Before delivery (default) or after shoot, per project | Final downloads unlock |
| Extra images | Client picks more than the offering's quota | Extra picks confirmed |
| Add-ons | Client adds e.g. express delivery, prints | Add-on line confirmed on the project |

- Amounts come from the project's quote lines (seeded from the offering, editable in
  admin); the server always recomputes prices, the client never sends an amount.
- Payment methods are enabled in the Stripe Dashboard (cards, Apple/Google Pay, SEPA,
  PayPal as available) — no code change needed to add one.
- `POST /api/stripe/webhook` verifies the signature and handles
  `checkout.session.completed`, `checkout.session.async_payment_succeeded` /
  `…_failed` (SEPA settles later) and `charge.refunded`. Events are processed
  idempotently by Stripe event ID and written to `Payments` and `Activity`.
- Refunds are made in the Stripe Dashboard; the webhook syncs them.
- **No VAT is charged (decision D6).** Prices are final amounts; Stripe sessions carry no
  tax lines. A `taxMode` setting (`none` · `smallBusinessNote` · `vat` + rate) in the
  `Profile` global keeps this switchable without code changes; `smallBusinessNote` adds the
  §19 UStG notice to proposals.
- Stripe sends receipts. **Legal invoices stay outside the site** (accounting tool) and
  are uploaded to the project's Documents; Stripe Invoicing can be evaluated later.
- Delivery gating ("finals unlock after balance") is a per-project switch, on by default.
- Keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, publishable key) live in Infisical and
  Coolify env; development uses Stripe test mode and the Stripe CLI for webhooks.

---

## 8. Feedback, connected

| Moment | Form | Visibility |
|---|---|---|
| After booking | 2 questions on the booking experience | private |
| After sneak peek | quick reaction (+ optional comment) | private |
| During proofing / revisions | picks, region comments, approvals | project |
| After delivery | review: ratings, quote, chosen favourite photo, per-photo publication consent | public after approval |

- Private feedback and public testimonials are separate records.
- Approved reviews render on the matching series page and on `/kind-words`.
- Publication consent is stored **per photo** and gates portfolio use of client images.
- Everything (picks, comments, approvals, stage changes, uploads) writes to an `Activity`
  log → one admin inbox and client notifications (email + Web Push).

---

## 9. Photographer side

- **Payload admin** remains the back office, with custom views: Projects board by stage,
  Inbox (inquiries + comments + reviews), Sync status (last webhook, last reconcile,
  failed jobs).
- **`/studio`** (admin-only PWA routes): phone uploads to a series / project / sneak peek
  (Web Share Target on Android, multi-select picker on iOS), reply to messages, move
  stages, approve reviews. Phone uploads are written into the matching Nextcloud folder so
  Nextcloud stays the single drop zone.

---

## 10. PWA

- `app/manifest.ts`: name, maskable icons, `display: standalone`, theme colours,
  shortcuts (Upload, Inbox, My gallery), `share_target` (POST multipart → `/studio/share`).
- Service worker via **Serwist**: precached app shell, runtime image cache with size and
  age limits, offline fallback page, Background Sync queue for picks and comments.
- **Web Push** (VAPID) for clients and admin (iOS ≥ 16.4 only when installed).
- "Add your gallery to the home screen" prompt and "Keep this gallery offline".

---

## 11. Data model (Payload)

| Collection | Key fields |
|---|---|
| `Photos` | source {ncFileId, path, etag, purpose}, versions[], width, height, exif, thumbhash, colour, focal point, alt/caption (localized), tags, rating, visibility (public/unlisted/private), publishConsent, series, gallery |
| `Series` | slug, title, story (rich text, localized), cover, genre, order, draft, linked reviews |
| `Genres` | slug, name |
| `Offerings` | genre, hero photos, includes, deliverables, quota, extra-image price, revision rounds, duration, from-price, deposit (amount or %), add-ons |
| `Inquiries` | answers, contact, locale, source, status |
| `Clients` (auth) | name, email, locale, projects |
| `Projects` | clients[], offering, date, location, stage, ncFolder, quote lines, payment status (deposit/balance), delivery gating, watermark text, questionnaire, internal notes |
| `Galleries` | project, kind (sneak-peek/proofing/final), rules (min/max, downloads), deliveredAt, expiresAt (+12 months), share links |
| `Payments` | project, kind (deposit/balance/extras/add-on), amount, currency, status, Stripe session / payment intent IDs, refunded amount |
| `Selections` | gallery, photo, picker, state |
| `Comments` | target (project/gallery/photo), x/y?, author, parent, resolved |
| `Reviews` | project, ratings, quote, chosen photo, visibility, approved |
| `Feedback` | project, moment, answers (private) |
| `Activity` | actor, verb, target, project |
| `PushSubscriptions` | owner, endpoint, keys |
| Globals `Profile`, `About`, `FAQ`, `SyncSettings` | bio, socials, contact, tax mode, Nextcloud paths |

---

## 12. Technical decisions

- **Keep** Next.js 15, Payload 3, Postgres, next-intl — **English and German only**
  (decision D3).
- Payload **migrations** instead of `push: true`.
- **Tailwind 4 only**; remove Tailwind 3 / autoprefixer config.
- **Payload Jobs Queue** for ingest, ZIPs, reminders, notifications.
- **sharp** for derivatives, **exifr** for metadata, **thumbhash** for placeholders.
- **React Email** bilingual templates; all user content escaped.
- **ALTCHA** (self-hosted proof-of-work) + honeypot + rate limiting replace reCAPTCHA.
- **Umami** only; drop Vercel analytics.
- **Stripe** (`stripe` Node SDK, Checkout Sessions + webhooks) for all payments (§7.5).
- **Optional later**: Google Calendar / Cal.com availability and consultation booking.

---

## 13. Roadmap

### Phase 0 — Make it work, make it safe ✅ done 2026-10-26

Also delivered beyond the original list: the image proxy now serves only images
below `Lightroom/Portfolio/` (it previously proxied any file in the Nextcloud
account); production database migrations replace `push` (which Payload never
runs in production — the `media` table was missing live), applied by a startup
runner that never crash-loops the site; approval-page translations fixed; the
privacy policy corrected (Hetzner, self-hosted Umami, no reCAPTCHA/Formspree);
the package is ESM (`"type": "module"`) so the Payload CLI works.

- Replace `src/lib/payload.ts` HTTP calls with the Local API; remove `NEXT_PUBLIC_CMS_URL`.
- Remove the shadowing `/api/reviews` route (or move custom logic under another path).
- Restrict `Albums` read; only `/api/albums/by-token/[token]` exposes the approval subset.
- Add `publicationConsent` or drop it from `/api/approve`.
- Escape all user input in emails; rate limit + honeypot on contact and review.
- Fail hard when `PAYLOAD_SECRET` is missing.
- Read real image dimensions; fix `/dashboard`; delete dead code and dependencies;
  unify hreflang; rewrite READMEs.

*Done when*: testimonials render, an approval link works end to end, `GET /api/albums`
reveals no tokens or emails, the build is clean.

### Phase 1 — Foundation

**1a ✅ done 2026-10-26** — `Series`, `Photos`, `Genres` collections, `sync-status`
global, en/de localization; Nextcloud sync (startup + 15-min reconcile, webhook
endpoint with per-folder debounce, file-id identity, re-export versions, soft
delete, rename handling); processing to AVIF + WebP (480/960/1600/2400, capped at
the original), blur placeholder, dominant colour, EXIF/IPTC/XMP metadata without
GPS; public pages, sitemap and approval page read from Payload; the old
per-request Nextcloud proxy is gone.
Deviation from §12: instead of the Payload Jobs Queue the sync runs as an
in-process serial queue — one container, and the reconcile repairs anything a
restart interrupts, so persistent jobs added tables without benefit. AVIF is
encoded at effort 0 (same size, ~30× faster: ~2.7 s per photo end to end).

**1b** — dedicated read-only `portfolio-sync` Nextcloud user (sees the share as `Portfolio/`; `NEXTCLOUD_PORTFOLIO_PATH`, `NEXTCLOUD_WEBHOOK_PATH_PREFIX`), webhook registration for file events below `Lightroom/Portfolio`.
**1b ✅ done 2026-10-26** — production syncs as `portfolio-sync` (read-only share);
seven Nextcloud webhooks (create/write/delete on `event.node.path`, rename/copy on
source and target) filtered by path regex only — a `userIdFilter` silently disables
webhooks for WebDAV uploads, because the app subscribes before the request is
authenticated. Delivery is via Nextcloud cron (≤ 5 min) + 60 s debounce.
**1c ✅ done 2026-10-26** — installable PWA: web manifest + icons (incl. maskable,
Apple touch), Serwist service worker (app shell precache, photos cache-first, public
pages network-first with offline fallback in en/de; admin, API and approval pages
are never cached).

- New collections (§11) with migrations; `Clients` auth separate from `Users`.
- Nextcloud sync: webhook route, debounce, reconcile job, ingest pipeline (§5),
  `portfolio-sync` user, sync status view.
- Migrate the existing `Formula 1` folder through the new pipeline.
- PWA shell: manifest, Serwist service worker, offline page.

*Done when*: dropping a file into `Lightroom/Portfolio/<series>/` shows it on the site
within minutes with correct ratio, metadata and placeholders; deleting/renaming behaves
per §5.3.

### Phase 2 — Public redesign

**2a ✅ done 2026-10-27** — design system above; home (viewfinder hero, justified
stream with genre filter, series as prints, about line, CTA, "say hi" footer), `/work`,
`/work/[series]`, `/p/[photo]` (fullscreen viewer: keys, swipe, info, share, URL per
photo), `/about`, `/contact` (prefilled from "book a shoot like this"), `/kind-words`;
old `/<album>` URLs redirect permanently; launch genres seeded (Formula 1 → Events &
Motorsport); sitemap with every photo; bottom tab bar in the installed app.
**2b ✅ done 2026-10-27** — `Offerings` (seeded with D1: Portraits, Events & Motorsport,
Cars & Brands; Weddings prepared), `sessions-settings` global (add-ons, price note),
admin-only `Inquiries`; `/sessions` shows an offering only when its genre has a published
series, each with photos from that genre; four-step "Plan your shoot" →
`/api/inquiry-submissions` (validation, honeypot, rate limit) → stored inquiry +
notification + bilingual confirmation; "book a shoot like this" preselects the offering.
Also fixed: the service worker's precache of `/de/offline` set the language cookie to
German for every visitor — offline pages are now precached under `/en|de/offline`
outside the i18n middleware, and the cookie was renamed (`locale`) to reset it.
**2c ✅ done 2026-10-27** — `about-page` global ("About & FAQ" in the admin): portrait,
bio, approach, short facts and the FAQ (en/de), seeded with the former texts and a starter
FAQ built from D1–D5; `/about` shows the FAQ (with FAQPage structured data), `/sessions`
shows the questions marked "also show on /sessions" above the planner. Empty fields fall
back to the built-in texts.

- Justified stream, series pages, photo permalinks and shared viewer.
- `/sessions` with Offerings, Plan-your-shoot → Inquiry.
- `/about`, `/contact` sheet, `/kind-words`, navigation, design tokens, dark viewing mode.

### Phase 3 — Client portal

Shipped in slices, each live on its own:

**3a ✅ done 2026-10-27** — `Clients` (no passwords), `Projects` (stage, clients, offering,
inquiry, date, place, next step, key dates, watermark text, internal notes), `Activity`.
Creating a project from an inquiry takes over client, offering, date and place; "invite
clients" emails a 7-day sign-in link. Sign-in by one-time email link (30 min; only a hash
is stored; the link opens a page with a button so mail scanners cannot use it up) → signed,
HTTP-only session cookie (30 days; "sign out everywhere" per client). Portal `/c` →
`/c/<project>`: next step, 12-stage timeline, details, client-visible activity; never
indexed or cached by the service worker. Project folders `Clients/<date> <slug>/{1 Preview,
2 Final, _from-client}` are created in Nextcloud; failures show on the project and retry on
every save. *Deviation:* clients are a plain collection with our own link + cookie session
instead of a Payload auth collection (Payload has no passwordless login). The startup runner
now applies data seeds after all schema migrations (the Local API expects the newest schema).
**Needs** `Lightroom/Clients` shared with `portfolio-sync` (read, edit, create).
**3b ✅ done 2026-10-27** — `Clients/<project>/1 Preview` → preview photos (≤ 2048 px WebP,
watermark burned in before any size is written: the project's text or "<CLIENT NAME> ·
PREVIEW", bundled JetBrains Mono so no system fonts are needed). Stored apart from the
portfolio and served only by `/api/previews/…` to the project's clients and admins (404
for everyone else); a new watermark text re-renders them. Unknown folders become project
stubs. First previews → stage *Selection* + email to every client. Portal
`/c/<project>/proofing`: justified grid with ♥, counter against the included number (extra
photos and price shown), filters (all / picked / not picked / with notes), two-up compare,
fullscreen viewer with notes pinned to a spot (x/y), several pickers merged. "Send my
selection" locks it, writes `_from-client/selection.txt` (with a Lightroom filter line) and
`selection.csv`, moves the project to *Editing*, emails both sides; clearing *submitted at*
in the admin reopens it. Sync: 15-min reconcile, "fetch previews now" on the project, and
webhooks for `Clients/` once the listeners' path filter includes it.
*Deviations:* offline-safe picks (Background Sync) postponed to Phase 5; extra photos are
counted and shown, paid in 3c.
**3c ✅ done 2026-10-27** — Proposal on the project (lines in €, note, deposit % from the
offering or a fixed amount; first line seeded from the inquiry's offering). *Send proposal*
emails every client a sign-in link and moves the project to *Proposal*. In the portal the
proposal is a receipt-style card: tick "I accept" → acceptance recorded (time, client,
activity, email to the photographer) → Stripe Checkout for the deposit (amount computed on
the server, no tax lines, `metadata.app` marks our sessions). `Payments` + idempotent
`/api/stripe/webhook` (completed / expired / async succeeded / async failed / refunded;
status only moves forward; events of other apps on the account are ignored); returning from
Checkout also asks Stripe directly. Paid deposit → *Booked*, emails to both sides; refunds
from the Dashboard sync. Without `STRIPE_SECRET_KEY` the portal records the acceptance and
says payment details follow by email. *Deployed with payments off* — the keys in Infisical
are the live keys of the account RoutePass uses, so enabling needs the owner's decision and a
portfolio webhook endpoint.
**3d ✅ done 2026-10-27** — Project tabs in the portal (Overview · Plan · Selection ·
Messages). *Plan*: date, place, meeting point and the day's schedule (set in the admin);
questionnaire from the offering's `planQuestions` (else five standard questions, en/de),
shot list with check-offs, moodboard (≤ 30 images, ≤ 15 MB, stored as private
`project-files` with thumbnails, served by `/api/portal/files` to the project's clients and
admins); editable until the shoot, then read-only; the photographer gets at most one
"plan updated" email per hour. *Messages*: one thread per project, photo notes from the
selection shown inline with a thumbnail; client messages email the photographer (reply-to
the client), replies created in the admin (*Inbox → Messages*, client empty) email every
client with a link to the thread.

- Magic link, project timeline, Plan section.
- `Clients/<project>/` folder creation; preview ingest → proofing gallery.
- Proofing v2 (picks, compare, filters, quota, multiple pickers), region comments,
  `selection.txt` write-back, Activity feed, email notifications.
- Preview watermark (client name) in the ingest pipeline.
- Stripe: proposal acceptance → deposit Checkout, webhook, `Payments`, Booked stage.

### Phase 4 — Delivery & feedback

**4a ✅ done 2026-10-27** — `Clients/<project>/2 Final` → finals mirrored to the storage box
(`MEDIA_DIR/finals/<fileId>/<version>/`: the original byte for byte, a 2048 px web JPEG and
unwatermarked gallery sizes), served only to the project's clients/admins. First finals →
stage *Delivery*, `deliveredAt`, `expiresAt` = +12 months (D5), email to every client.
Portal tab *Your photos*: gallery + viewer, single downloads (full resolution / web size,
UTF-8 file names) and "download all" as a ZIP streamed while it is built (stored, ZIP64; no
temp files). Housekeeping (independent of the sync, every 6 h): reminders at 30 and 7 days;
on expiry the server copies are deleted (photos *expired*, `purgedAt`); moving `expiresAt`
into the future restores the gallery from Nextcloud and resets the reminders. A project's
folder is synced right after it is created. *Deviation:* the ZIP is streamed instead of
built asynchronously — no storage needed, but not resumable.

**4b ✅ done 2026-10-27** — Revision rounds on delivered photos (`revisions` collection;
rounds from the offering or `revisionRounds.included` on the project). In the gallery
viewer the client collects change requests (optionally pinned to a spot), then sends them as
one round → stage *Revisions*, email to the photographer, `_from-client/revisions-round-N.txt`
with a Lightroom filter line. A re-export of the photo (same file, new etag) marks its
requests done and keeps the previous version for a before/after slider (only the current and
the previous version are stored); "done" can also be set by hand in the admin. When the last
open request of a round is done, the clients get an email. They approve or say "still not
right" (a new draft for the next round, while rounds are left); with nothing open the
project returns to *Delivery*.

**4c ✅ done 2026-10-28** — Balance before downloads. `lib/billing` computes, on the server,
accepted proposal total + extra photos (`proofing.extras`, set from the selection on
submission, editable to waive) − payments net of refunds; nothing is owed before the proposal
is accepted. With `billing.gateDownloads` (on by default) and an open balance, clients can view
the finals — capped at 960 px and not cached — but single and ZIP downloads answer 402 and the
gallery shows the balance card instead of download links. The balance is paid by Stripe
Checkout (`/api/portal/pay`, kind `balance`; a new Checkout closes all open ones of the
project) or marked as paid by hand (`billing.balancePaidAt`; studio button *Mark balance paid*
/ undo). Settling it logs a client-visible activity and pushes "Downloads are open"; the
delivery email and push mention the balance while it is open. The overview shows the balance
card from *Editing* on. *Deferred:* client-chosen add-ons (they can be added as proposal lines).

**4d ✅ done 2026-10-27** — Private `feedback` (five faces + comment) asked once at a time on the
project overview: after booking (Booked…Shoot) and after the sneak peek (Sneak peek…Editing);
emailed to the photographer, never published. Review after delivery (`/c/<project>/review`,
tab *Review*): four star ratings, quote, display name and occasion, favourite delivered photo,
**per-photo publication consent** (`photos.publishConsent` yes/no/unknown with who and when;
changeable or withdrawable any time afterwards; per photo, so on shared projects the last
change wins) and agreement to publish the text. One review per client; project → *Feedback*.
Reviews stay private until approved in *Inbox → Reviews*; approved ones show on `/kind-words`
and, with a series chosen, on that series page. Housekeeping sends one review invitation 7
days after delivery if nobody has reviewed yet.

**4e ✅ done 2026-10-28** — Web Push (VAPID, `web-push@3.6.7`; keys in Infisical as
`PORTFOLIO_VAPID_*` and in the Coolify env). `push-subscriptions` per device (client or
photographer, with its language); `/api/push/subscribe` (GET key, POST, DELETE own); service
worker shows notifications and opens/focuses the page. "Notify me on this device" on the
project overview (on iPhone it explains Home Screen first). Clients: proposal, previews,
delivery, changes done, reply from the photographer. Photographer: inquiry, contact message,
client message, selection, change requests, proposal accepted, payment, feedback, review.
Best effort next to the emails; expired subscriptions (404/410) are removed. Photographer
notifications open the matching `/studio` page.

**4f ✅ done 2026-10-28** — `/studio`, the photographer's phone app (own root layout, English,
noindex, outside the i18n middleware and the service-worker cache; Payload admin login,
redirect back after sign-in). *Inbox*: messages to answer (with reply), new inquiries
(→ project in one tap), open change requests, reviews to publish, recent feedback, push
toggle. *Projects*: grouped by stage; detail with stage switch, fetch photos, invite clients,
upload, facts (folder, previews, picks, finals, open changes, gallery expiry), conversation
with reply, activity. *Upload*: to a project's `1 Preview` / `2 Final` or a portfolio series
(also a new one; "_" for a draft) — files go to Nextcloud (single drop zone), then the sync
runs; a project without folder gets one on the spot; a read-only share gives a clear
message. Manifest shortcuts (Inbox, Upload) and a Web Share Target (`/studio/share`, Android):
shared photos wait up to a day until a destination is picked. The share route verifies the
`SameSite=Lax` login cookie itself because the share sheet posts without the Origin header
Payload's CSRF check needs. *Needs* write access on `Lightroom/Portfolio` for portfolio uploads.

- Versions and revision approvals; final mirroring, signed downloads, async ZIP.
- 12-month expiry with 30/7-day reminders, admin extend, purge job.
- Stripe: balance (with delivery gating), extra images above quota, add-ons, refunds sync. ✅ (add-ons as proposal lines)
- Staged feedback and review flow with per-photo consent.
- Web Push; `/studio` with share target and phone upload to Nextcloud.

### Phase 5 — Extras
- Offline galleries, calendar availability, statistics, Stripe Invoicing evaluation.

---

## 14. Decisions

| # | Question | Decision |
|---|---|---|
| D0 | Keep Nextcloud? | Yes — Nextcloud is the Lightroom drop zone for portfolio, previews and finals; the site ingests and serves (§5) |
| D1 | Genres at launch | Portraits · Events & Motorsport · Cars & Brands (+ "Something else?"); weddings prepared but hidden; offerings only shown when their genre has a published series (§6) |
| D2 | Payments | Stripe integrated: deposit, balance, extra images, add-ons via Checkout + webhooks; invoices stay external (§7.5) |
| D3 | Languages | English and German only |
| D4 | Preview watermark | Subtle corner overlay with the client's name on all previews; never on finals (§5.4) |
| D5 | Final gallery lifetime | 12 months online, reminders at 30/7 days, admin can extend, then purge (§5.4) |
| D6 | Tax | No VAT charged; prices are final; `taxMode` setting keeps it switchable (§7.5) |

### Still needed before Phase 2 goes live (content)

- One published portrait series and one cars/brands series, so all three launch offerings
  are visible.

## 15. Risks

| Risk | Mitigation |
|---|---|
| Webhook latency / loss | Debounce + 15-min reconcile; optional Nextcloud webhook worker |
| Storage box space for mirrored finals | 12-month purge; per-project size shown in admin |
| Payment state drifting from Stripe | Signed, idempotent webhooks; nightly reconcile of open Checkout sessions |
| iOS PWA limits (no share target, push only when installed) | Picker fallback; email remains the primary notification |
| Schema migration from `push: true` | Snapshot DB, generate baseline migration before Phase 1 |
| Client photo consent | Per-photo consent required before a client image can be public |
