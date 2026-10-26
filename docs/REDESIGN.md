# Redesign Plan — Photography Portfolio & Client Platform

Status: **draft for review** · Date: 2026-10-26

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
- **Neutral stage.** Near-black / near-white backgrounds, dark viewing mode by default for
  galleries, one restrained type pairing (display serif + Inter).
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
| Preview | ~2048 px WebP; optional watermark / client-name overlay; original filename kept | Signed, expiring URLs scoped to project or share link |
| Final | Original **mirrored** to storage box; web-size set for social; ZIP built async | Signed download URLs in the portal; purged after gallery expiry |

Finals are mirrored rather than streamed from home so delivery does not depend on the
home server's uptime or upload bandwidth.

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
- **Documents**: proposal / confirmation (accepted with timestamp), later invoices.
- **Feedback**: see §8.

### 7.4 Lightroom round trip

On submission the site writes `Clients/<project>/_from-client/selection.txt` (filenames
ready for the Lightroom Library filter + comments) and a CSV with ratings/labels. It syncs
to the Mac automatically.

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
| `Offerings` | genre, hero photos, includes, deliverables, quota, extra-image price, revision rounds, duration, from-price, add-ons |
| `Inquiries` | answers, contact, locale, source, status |
| `Clients` (auth) | name, email, locale, projects |
| `Projects` | clients[], offering, date, location, stage, ncFolder, quote lines, deposit status, questionnaire, internal notes |
| `Galleries` | project, kind (sneak-peek/proofing/final), rules (min/max, downloads, watermark, expiry), share links |
| `Selections` | gallery, photo, picker, state |
| `Comments` | target (project/gallery/photo), x/y?, author, parent, resolved |
| `Reviews` | project, ratings, quote, chosen photo, visibility, approved |
| `Feedback` | project, moment, answers (private) |
| `Activity` | actor, verb, target, project |
| `PushSubscriptions` | owner, endpoint, keys |
| Globals `Profile`, `About`, `FAQ`, `SyncSettings` | bio, socials, contact, Nextcloud paths |

---

## 12. Technical decisions

- **Keep** Next.js 15, Payload 3, Postgres, next-intl (en/de; es optional).
- Payload **migrations** instead of `push: true`.
- **Tailwind 4 only**; remove Tailwind 3 / autoprefixer config.
- **Payload Jobs Queue** for ingest, ZIPs, reminders, notifications.
- **sharp** for derivatives, **exifr** for metadata, **thumbhash** for placeholders.
- **React Email** bilingual templates; all user content escaped.
- **ALTCHA** (self-hosted proof-of-work) + honeypot + rate limiting replace reCAPTCHA.
- **Umami** only; drop Vercel analytics.
- **Optional later**: Stripe deposit links; Google Calendar / Cal.com availability and
  consultation booking.

---

## 13. Roadmap

### Phase 0 — Make it work, make it safe
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
- New collections (§11) with migrations; `Clients` auth separate from `Users`.
- Nextcloud sync: webhook route, debounce, reconcile job, ingest pipeline (§5),
  `portfolio-sync` user, sync status view.
- Migrate the existing `Formula 1` folder through the new pipeline.
- PWA shell: manifest, Serwist service worker, offline page.

*Done when*: dropping a file into `Lightroom/Portfolio/<series>/` shows it on the site
within minutes with correct ratio, metadata and placeholders; deleting/renaming behaves
per §5.3.

### Phase 2 — Public redesign
- Justified stream, series pages, photo permalinks and shared viewer.
- `/sessions` with Offerings, Plan-your-shoot → Inquiry.
- `/about`, `/contact` sheet, `/kind-words`, navigation, design tokens, dark viewing mode.

### Phase 3 — Client portal
- Magic link, project timeline, Plan section.
- `Clients/<project>/` folder creation; preview ingest → proofing gallery.
- Proofing v2 (picks, compare, filters, quota, multiple pickers), region comments,
  `selection.txt` write-back, Activity feed, email notifications.

### Phase 4 — Delivery & feedback
- Versions and revision approvals; final mirroring, signed downloads, async ZIP, expiry.
- Staged feedback and review flow with per-photo consent.
- Web Push; `/studio` with share target and phone upload to Nextcloud.

### Phase 5 — Extras
- Offline galleries, payments, calendar availability, statistics, Spanish.

---

## 14. Open questions

1. Which genres/offerings should `/sessions` present at launch?
2. Payments (deposits) in scope, or quotes and confirmations only?
3. Languages: en/de only, or add es?
4. Watermark on proofing previews: none, subtle name overlay, or configurable per project?
5. Default gallery expiry for final deliveries (e.g. 6 or 12 months)?

## 15. Risks

| Risk | Mitigation |
|---|---|
| Webhook latency / loss | Debounce + 15-min reconcile; optional Nextcloud webhook worker |
| Storage box space for mirrored finals | Expiry purge; per-project size shown in admin |
| iOS PWA limits (no share target, push only when installed) | Picker fallback; email remains the primary notification |
| Schema migration from `push: true` | Snapshot DB, generate baseline migration before Phase 1 |
| Client photo consent | Per-photo consent required before a client image can be public |
