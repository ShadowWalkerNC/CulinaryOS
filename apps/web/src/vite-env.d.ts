/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMPANY_WEBSITE_URL?: string;
  readonly VITE_API_URL:          string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
