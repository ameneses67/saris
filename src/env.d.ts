/// <reference path="../worker-configuration.d.ts" />

// Extender Cloudflare.Env con las variables de entorno (secrets) que no
// aparecen en wrangler.jsonc pero sí están disponibles en el runtime
declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string
    BETTER_AUTH_URL: string
  }
}

declare namespace App {
  interface Locals {
    user: {
      id: string
      name: string
      email: string
      role: 'admin' | 'editor'
    } | null
    session: {
      id: string
      userId: string
      expiresAt: Date
    } | null
  }
}
