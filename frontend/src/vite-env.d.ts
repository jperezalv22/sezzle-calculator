// Types the app's own env vars. Without this, import.meta.env.VITE_API_BASE_URL
// type-checks as `any`, and a typo in the name is not caught.
interface ImportMetaEnv {
  /** API origin, e.g. https://api.example.com. Empty means same origin. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
