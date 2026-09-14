const API_URL = import.meta.env.API_URL;

export const fetcher = async (url: string) => {
  const response = await fetch(`${API_URL}${url}`, { credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'Request failed. Please try again.'), { status: response.status });
  return result;
};

export const mutation = async (url: string, { arg }: { arg: Record<string, string> }) => {
  const response = await fetch(`${API_URL}${url}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg) });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Request failed. Please try again.');
  return result;
};

export const deleteMutation = async (url: string, { arg }: { arg: Record<string, string> }) => {
  const response = await fetch(`${API_URL}${url}`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Request failed. Please try again.');
  return result;
};

export const goalMutation = async (url: string, { arg }: { arg: { method: string; data: unknown } }) => {
  const response = await fetch(`${API_URL}${url}`, { method: arg.method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg.data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Could not save the goal.');
  return result;
};
