/// <reference path="../worker-configuration.d.ts" />

// Variables de entorno de Cloudflare (complementan los bindings de worker-configuration.d.ts)
interface Env {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env
    }
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
