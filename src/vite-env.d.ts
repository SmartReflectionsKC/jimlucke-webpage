/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTENT_SOURCE?: string;
  readonly VITE_SANITY_PROJECT_ID?: string;
  readonly VITE_SANITY_DATASET?: string;
  readonly VITE_SANITY_API_VERSION?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
