import type { ENV } from './env.ts';

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    readonly APP_ENV: string;
    readonly APP_NAME: string;
    readonly APP_VERSION: string;
  }

  interface Window {
    config: ENV;
  }
}
