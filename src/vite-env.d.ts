/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SPOTIFY_CLIENT_ID?: string
  readonly VITE_SPOTIFY_REDIRECT_URI?: string
  readonly VITE_SPOTIFY_CONTEXT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
