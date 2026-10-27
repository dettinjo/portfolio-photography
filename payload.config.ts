import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import { Users } from './src/payload/collections/Users'
import { Albums } from './src/payload/collections/Albums'
import { Reviews } from './src/payload/collections/Reviews'
import { Media } from './src/payload/collections/Media'
import { Genres } from './src/payload/collections/Genres'
import { Series } from './src/payload/collections/Series'
import { Photos } from './src/payload/collections/Photos'
import { Clients } from './src/payload/collections/Clients'
import { Projects } from './src/payload/collections/Projects'
import { Activity } from './src/payload/collections/Activity'
import { Picks } from './src/payload/collections/Picks'
import { Comments } from './src/payload/collections/Comments'
import { Payments } from './src/payload/collections/Payments'
import { StripeEvents } from './src/payload/collections/StripeEvents'
import { ProjectFiles } from './src/payload/collections/ProjectFiles'
import { Messages } from './src/payload/collections/Messages'
import { SyncStatus } from './src/payload/globals/SyncStatus'
import { SessionsSettings } from './src/payload/globals/SessionsSettings'
import { AboutPage } from './src/payload/globals/AboutPage'
import { Offerings } from './src/payload/collections/Offerings'
import { Inquiries } from './src/payload/collections/Inquiries'
import { smtpOptions } from './src/lib/mailer'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Never run production with a guessable secret. The check is skipped while
// `next build` collects pages, because runtime secrets are not available there.
const secret = process.env.PAYLOAD_SECRET
if (
  !secret &&
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  throw new Error('PAYLOAD_SECRET must be set in production')
}

const portfolioUrl = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}`
  : 'https://photosby.joeldettinger.de'

export default buildConfig({
  serverURL: portfolioUrl,
  admin: {
    user: Users.slug,
    meta: { titleSuffix: '— Portfolio CMS' },
    importMap: {
      baseDir: path.resolve(dirname, 'src'),
    },
  },
  routes: {
    admin: '/admin',
  },
  collections: [Series, Photos, Genres, Offerings, Inquiries, Albums, Reviews, Clients, Projects, Picks, Comments, Payments, StripeEvents, ProjectFiles, Messages, Activity, Media, Users],
  globals: [SyncStatus, SessionsSettings, AboutPage],
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'Deutsch', code: 'de' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  editor: lexicalEditor(),
  secret: secret ?? 'dev-only-insecure-secret',
  typescript: {
    outputFile: path.resolve(dirname, 'src', 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL,
      connectionTimeoutMillis: 5000,
    },
    // Development: Payload pushes the schema automatically (push is ignored in production).
    // Production: src/instrumentation.ts runs the migrations in src/migrations on
    // startup. After changing a collection, run `npm run migrate:create <name>`
    // and commit the generated files.
    push: true,
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM ?? 'photosby@joeldettinger.de',
    defaultFromName: 'Joel Dettinger Photography',
    transportOptions: smtpOptions,
  }),
  sharp,
  cors: [portfolioUrl, 'http://localhost:3000'],
  csrf: [portfolioUrl, 'http://localhost:3000'],
  upload: {
    limits: { fileSize: 20_000_000 }, // 20 MB
  },
})
