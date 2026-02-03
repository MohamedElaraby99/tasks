/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for API (e.g. http://localhost:3001/api or /api in production) */
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Socket.io server URL for real-time updates */
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
