import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'

import { Users } from './src/payload/collections/Users'
import { Media } from './src/payload/collections/Media'
import { Albums } from './src/payload/collections/Albums'
import { Reviews } from './src/payload/collections/Reviews'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const db =
  process.env.POSTGRES_URL ||
  (process.env.DATABASE_URI &&
    (process.env.DATABASE_URI.startsWith('postgres://') ||
      process.env.DATABASE_URI.startsWith('postgresql://')))
    ? postgresAdapter({
        pool: {
          connectionString: process.env.POSTGRES_URL ?? process.env.DATABASE_URI,
          connectionTimeoutMillis: 5000,
        },
      })
    : sqliteAdapter({
        client: { url: process.env.DATABASE_URI ?? 'file:./payload.db' },
      })

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
      importMapFile: path.resolve(dirname, 'payload.importmap.ts'),
    },
    meta: { titleSuffix: '— Photography CMS' },
  },
  collections: [Users, Media, Albums, Reviews],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? 'change-me-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM ?? 'server@joeldettinger.de',
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
  plugins: [],
})
