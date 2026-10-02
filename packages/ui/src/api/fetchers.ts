/**
 * FETCHERS
 */
const getShareHeaders = (): Record<string, string> => {
  const isSharePath = window.location.pathname.startsWith('/share/');
  if (!isSharePath) return {};
  const token = window.sessionStorage.getItem('pulsio_share_token');
  if (!token) return {};
  return { 'X-Pulsio-Share-Token': token };
};

export const GET = async <Result>([path]: [string]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const headers = { 'Content-Type': 'application/json', ...getShareHeaders() };
  const response = await fetch(url, { method: 'GET', credentials: 'include', headers });
  if (!response.ok) throw await getError({ method: 'GET', path, response });
  const data: Result = await response.json();
  return data;
};

export const DOWNLOAD = async (path: string): Promise<Blob> => {
  const url = new URL(path, window.config.API_URL);
  const headers = getShareHeaders();
  const response = await fetch(url, { method: 'GET', credentials: 'include', headers });
  if (!response.ok) throw await getError({ method: 'GET', path, response });
  const blob = await response.blob();
  return blob;
};

export const POST = async <Result>([path, params]: [string, unknown?]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const headers = { 'Content-Type': 'application/json', ...getShareHeaders() };
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(params) });
  if (!response.ok) throw await getError({ method: 'POST', path, response });
  const data: Result = await response.json();
  return data;
};

export const PUT = async <Result>([path, params]: [string, unknown?]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const headers = { 'Content-Type': 'application/json', ...getShareHeaders() };
  const response = await fetch(url, { method: 'PUT', credentials: 'include', headers, body: JSON.stringify(params) });
  if (!response.ok) throw await getError({ method: 'PUT', path, response });
  const data: Result = await response.json();
  return data;
};

export const MPUT = async <Result, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const headers = { 'Content-Type': 'application/json', ...getShareHeaders() };
  const response = await fetch(url, { method: 'PUT', credentials: 'include', headers, body });
  if (!response.ok) throw await getError({ method: 'PUT', path, response });
  const data: Result = await response.json();
  return data;
};

export const DELETE = async <Result = void>([path]: [string]): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const headers = { 'Content-Type': 'application/json', ...getShareHeaders() };
  const response = await fetch(url, { method: 'DELETE', credentials: 'include', headers });
  if (!response.ok) throw await getError({ method: 'DELETE', path, response });
  if (response.status === 204) return null as Result;
  const data: Result = await response.json();
  return data;
};

/**
 * MUTATORS
 */
type MutationTrigger<Arg> = { arg: Arg };

const redirectToAuthIfSessionIsMissing = (code: string | undefined) => {
  const isAuthPath = window.location.pathname === '/auth';
  const isSharePath = window.location.pathname.startsWith('/share/');

  if (code === 'NO_SESSION' && !isAuthPath && !isSharePath) window.location.replace('/auth');
};

const getError = async ({ method, path, response }: { method: string; path: string; response: Response }) => {
  let message = `${method} ${path} failed with ${response.status}`;
  let code: string | undefined;

  try {
    const data = (await response.json()) as { code?: string; message?: string };
    code = data.code;
    if (data.message) message = data.message;
  } catch {}

  redirectToAuthIfSessionIsMissing(code);

  return Object.assign(new Error(message), { code, status: response.status });
};

export const MPOST = async <Result, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const headers = { 'Content-Type': 'application/json', ...getShareHeaders() };
  const response = await fetch(url, { method: 'POST', credentials: 'include', headers, body });
  if (!response.ok) throw await getError({ method: 'POST', path, response });
  const data: Result = await response.json();
  return data;
};

export const MUPLOAD = async <Result>(path: string, { arg }: MutationTrigger<FormData>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const response = await fetch(url, { method: 'POST', credentials: 'include', body: arg });
  if (!response.ok) throw await getError({ method: 'POST', path, response });
  const data: Result = await response.json();
  return data;
};

export const MDELETE = async <Result = void, Arg = void>(path: string, { arg }: MutationTrigger<Arg>): Promise<Result> => {
  const url = new URL(path, window.config.API_URL);
  const body = arg !== undefined ? JSON.stringify(arg) : undefined;
  const headers = { 'Content-Type': 'application/json', ...getShareHeaders() };
  const response = await fetch(url, { method: 'DELETE', credentials: 'include', headers, body });
  if (!response.ok) throw await getError({ method: 'DELETE', path, response });
  if (response.status === 204) return null as Result;
  const data: Result = await response.json();
  return data;
};
