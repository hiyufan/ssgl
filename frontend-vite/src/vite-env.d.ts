/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Go backend API. Defaults to "/api/v1" (proxied in dev). */
  readonly VITE_API_BASE_URL?: string;
  /** Base URL of the Python AI service. */
  readonly VITE_AI_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
