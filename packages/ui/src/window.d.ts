declare global {
  interface Window {
    config: {
      [key: string]: unknown;
    };
  }
}
