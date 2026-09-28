/**
 * FETCHERS
 */
export const GET = async <Result>([path]: [string]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw await getError({ method: 'GET', path, response });
  const data: Result = await response.json();
  return data;
};

export const POST = async <Result>([path, params]: [string, unknown?]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  if (!response.ok) throw await getError({ method: 'POST', path, response });
  const data: Result = await response.json();
  return data;
};

export const PUT = async <Result>([path, params]: [string, unknown?]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  if (!response.ok) throw await getError({ method: 'PUT', path, response });
  const data: Result = await response.json();
  return data;
};

export const MPUT = async <Result, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const response = await fetch(url, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body });
  if (!response.ok) throw await getError({ method: 'PUT', path, response });
  const data: Result = await response.json();
  return data;
};

export const DELETE = async <Result = void>([path]: [string]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw await getError({ method: 'DELETE', path, response });
  if (response.status === 204) return null as Result;
  const data: Result = await response.json();
  return data;
};

/**
 * MUTATORS
 */
type MutationTrigger<Arg> = { arg: Arg };

const getError = async ({ method, path, response }: { method: string; path: string; response: Response }) => {
  let message = `${method} ${path} failed with ${response.status}`;

  try {
    const data = (await response.json()) as { message?: string };
    if (data.message) message = data.message;
  } catch {}

  return Object.assign(new Error(message), { status: response.status });
};

export const MPOST = async <Result, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body });
  if (!response.ok) throw await getError({ method: 'POST', path, response });
  const data: Result = await response.json();
  return data;
};

export const MDELETE = async <Result = void, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const response = await fetch(url, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body });
  if (!response.ok) throw await getError({ method: 'DELETE', path, response });
  if (response.status === 204) return null as Result;
  const data: Result = await response.json();
  return data;
};
