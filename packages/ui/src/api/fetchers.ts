/**
 * FETCHERS
 */
export const GET = async <Result>([path]: [string]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw Object.assign(new Error(`GET ${path} failed with ${response.status}`), { status: response.status });
  const data: Result = await response.json();
  return data;
};

export const POST = async <Result>([path, params]: [string, unknown?]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  if (!response.ok) throw Object.assign(new Error(`POST ${path} failed with ${response.status}`), { status: response.status });
  const data: Result = await response.json();
  return data;
};

export const PUT = async <Result>([path, params]: [string, unknown?]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  if (!response.ok) throw Object.assign(new Error(`PUT ${path} failed with ${response.status}`), { status: response.status });
  const data: Result = await response.json();
  return data;
};

export const DELETE = async <Result = void>([path]: [string]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw Object.assign(new Error(`DELETE ${path} failed with ${response.status}`), { status: response.status });
  if (response.status === 204) return null as Result;
  const data: Result = await response.json();
  return data;
};

/**
 * MUTATORS
 */
type MutationTrigger<Arg> = { arg: Arg };

export const MPOST = async <Result, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body });
  if (!response.ok) throw Object.assign(new Error(`POST ${path} failed with ${response.status}`), { status: response.status });
  const data: Result = await response.json();
  return data;
};

export const MDELETE = async <Result = void, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const response = await fetch(url, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body });
  if (!response.ok) throw Object.assign(new Error(`DELETE ${path} failed with ${response.status}`), { status: response.status });
  if (response.status === 204) return null as Result;
  const data: Result = await response.json();
  return data;
};
