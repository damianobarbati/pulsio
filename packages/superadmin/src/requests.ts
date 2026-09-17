const getApiUrl = () => window.config.API_URL;

const unauthorized = () => window.dispatchEvent(new Event('superadmin:unauthorized'));

export const fetcher = async (url: string) => {
  const response = await fetch(`${getApiUrl()}${url}`, { credentials: 'include' });
  if (response.status === 401) {
    unauthorized();
    throw Object.assign(new Error('Access denied. Enter valid superadmin credentials.'), { status: 401 });
  }
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'Request failed. Please try again.'), { status: response.status });
  return result;
};

export const login = async (_key: string, { arg }: { arg: { username: string; password: string } }) => {
  const response = await fetch(`${getApiUrl()}/s/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'Could not authenticate.'), { status: response.status });
  return result;
};

export const logout = async () => {
  const response = await fetch(`${getApiUrl()}/s/auth/logout`, { method: 'POST', credentials: 'include' });
  if (!response.ok) throw new Error('Could not sign out.');
};

export const mutation = async (_key: string, { arg }: { arg: { url: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown } }) => {
  const { url } = arg;
  const response = await fetch(`${getApiUrl()}${url}`, {
    method: arg.method,
    credentials: 'include',
    headers: arg.body ? { 'Content-Type': 'application/json' } : undefined,
    body: arg.body ? JSON.stringify(arg.body) : undefined,
  });
  if (response.status === 401) unauthorized();
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'Request failed. Please try again.'), { status: response.status });
  return result;
};
