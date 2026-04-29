/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OCR_API_URL: string
  readonly VITE_EXTERNAL_API_URL: string
  readonly VITE_PARENT_ORIGIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
