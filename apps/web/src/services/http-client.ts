import { resolveBackendUrl } from './backend-url';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function backendUrl(path: string) {
  if (!API_BASE)
    throw new ApiError(
      '尚未配置后端地址。请设置 NEXT_PUBLIC_API_URL 后重新部署，或开启 Mock。',
      0,
      'unconfigured',
    );
  return resolveBackendUrl(
    path,
    API_BASE,
    typeof window === 'undefined' ? undefined : window.location.origin,
  );
}

async function response(
  path: string,
  options: RequestInit = {},
  local = false,
  timeoutMs = 15000,
): Promise<Response> {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  let result: Response;
  try {
    result = await fetch(local ? path : backendUrl(path), { ...options, signal });
  } catch (error) {
    if (options.signal?.aborted || error instanceof ApiError) throw error;
    throw new ApiError(
      local
        ? 'Mock 本地演示音频加载失败，请刷新页面或重新部署静态资源。'
        : '无法连接后端，请检查网络与服务地址，或切换 Mock。',
      0,
      'network',
    );
  }
  if (!result.ok) {
    const body = await result.json().catch(() => ({}));
    const message = local
      ? 'Mock 本地演示音频加载失败，请刷新页面或重新部署静态资源。'
      : typeof body.detail === 'string'
        ? body.detail
        : `请求失败 (${result.status})，请重试。`;
    throw new ApiError(message, result.status, body.code);
  }
  return result;
}

export const httpClient = {
  async json<T>(path: string, options?: RequestInit, timeoutMs = 15000): Promise<T> {
    return (await response(path, options, false, timeoutMs)).json();
  },
  async blob(path: string, options?: RequestInit, local = false): Promise<Blob> {
    return (await response(path, options, local)).blob();
  },
};
