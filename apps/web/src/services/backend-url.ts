/** Resolve HTTP and WS from the same base, including the development same-origin prefix. */
export function resolveBackendUrl(path: string, base: string, browserOrigin?: string): string {
  const target = base.replace(/\/$/, '') + path;
  if (/^https?:\/\//.test(base)) return target;
  if (base.startsWith('/') && !base.startsWith('//') && browserOrigin)
    return new URL(target, browserOrigin).toString();
  throw new Error('后端地址配置无效；本地使用开发代理，生产环境请配置后端 origin。');
}
