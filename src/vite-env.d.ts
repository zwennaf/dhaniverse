/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_LIVEKIT_SERVER_URL: string
  readonly VITE_LIVEKIT_API_KEY: string
  readonly VITE_LIVEKIT_API_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
