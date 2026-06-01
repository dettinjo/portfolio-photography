FROM node:20-alpine AS base

# ── deps: install all node_modules (including devDeps for the build) ──────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Keep NODE_ENV=development so devDependencies are always installed,
# regardless of what Coolify or the CI runner injects.
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# ── builder: compile the Next.js app ─────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# Provide safe defaults so the build works in CI without explicit --build-arg.
# These can be overridden: docker build --build-arg NEXT_PUBLIC_FULL_NAME="..."
ARG NEXT_PUBLIC_FULL_NAME="Joel Dettinger"
ARG NEXT_PUBLIC_LINKEDIN_USERNAME="joeldettinger"
ARG NEXT_PUBLIC_INSTAGRAM_USERNAME="joeldettinger"
ARG NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN="photosby.joeldettinger.de"
ARG NEXT_PUBLIC_CMS_URL="https://cms.joeldettinger.de"
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY=""

ENV NEXT_PUBLIC_FULL_NAME=$NEXT_PUBLIC_FULL_NAME
ENV NEXT_PUBLIC_LINKEDIN_USERNAME=$NEXT_PUBLIC_LINKEDIN_USERNAME
ENV NEXT_PUBLIC_INSTAGRAM_USERNAME=$NEXT_PUBLIC_INSTAGRAM_USERNAME
ENV NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN=$NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN
ENV NEXT_PUBLIC_CMS_URL=$NEXT_PUBLIC_CMS_URL
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY

RUN npm run build

# ── runner: minimal production image ─────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs \
 && apk add --no-cache curl

COPY --from=builder /app/public ./public

RUN mkdir -p .next public/media \
 && chown -R nextjs:nodejs .next public/media

# The standalone output bundles everything needed to run the server.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
