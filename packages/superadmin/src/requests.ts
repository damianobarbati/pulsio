const getApiUrl = () => window.config.API_URL;

export const fetcher = async (url: string) => {
  const response = await fetch(`${getApiUrl()}${url}`, { credentials: 'include' });
  if (response.status === 401) throw Object.assign(new Error('Access denied. Enter valid superadmin credentials.'), { status: 401 });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'Request failed. Please try again.'), { status: response.status });
  return result;
};

export const mutation = async (_key: string, { arg }: { arg: { url: string; method: 'POST' | 'DELETE' } }) => {
  const { url } = arg;
  const response = await fetch(`${getApiUrl()}${url}`, { method: arg.method, credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'Request failed. Please try again.'), { status: response.status });
  return result;
};
