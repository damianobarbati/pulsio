export {};

declare global {
  interface Window {
    config: {
      API_URL: string;
    };
  }
}
