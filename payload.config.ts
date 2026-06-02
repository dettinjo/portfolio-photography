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

const dirname = path.dirname(fileURLToPath(import.meta.url))

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
  collections: [Users, Albums, Reviews, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? 'change-me-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'src', 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL,
      connectionTimeoutMillis: 5000,
    },
    push: true, // auto-sync schema to DB on startup (no manual migrations needed)
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM ?? 'photosby@joeldettinger.de',
    defaultFromName: 'Joel Dettinger Photography',
    transportOptions: {
      host: process.env.SMTP_HOST ?? 'web207.dogado.net',
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER ?? 'admin@joeldettinger.de',
        pass: process.env.SMTP_PASS,
      },
    },
  }),
  sharp,
  cors: [portfolioUrl, 'http://localhost:3000'],
  csrf: [portfolioUrl, 'http://localhost:3000'],
  upload: {
    limits: { fileSize: 20_000_000 }, // 20 MB
  },
})
