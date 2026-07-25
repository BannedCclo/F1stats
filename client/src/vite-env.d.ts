/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_F1_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
