// Without this, a typo in an env var name type-checks as `any`.
interface ImportMetaEnv {
  /** API origin, e.g. https://api.example.com. Empty means same origin. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
