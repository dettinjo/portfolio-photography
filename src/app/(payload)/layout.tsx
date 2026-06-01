/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import type { ServerFunctionClient } from 'payload'

import { importMap } from '../../../payload.importmap'

// Server action to handle Payload server functions using the local API
const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  
  const { getPayload } = await import('payload')
  const payload = await getPayload({ config: await config })
  
  // Use Payload's built-in function handling
  // @ts-expect-error - Payload internals
  return payload.functions?.[args.name]?.(args)
}

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
