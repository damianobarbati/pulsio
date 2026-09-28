type AppConfig = {
  API_URL: string;
  WEBAPP_URL: string;
};

export const getConfig = async (): Promise<AppConfig> => {
  const response = await fetch('/config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load application runtime configuration');
  const config = (await response.json()) as AppConfig;
  if (!config.API_URL || !config.WEBAPP_URL) throw new Error('Missing application runtime configuration');
  return config;
};
