/** Local proxy is deliberately excluded from production builds and Vercel deployments. */
export function createWebConfig(mode: string | undefined, target: string, apiUrl: string) {
  const development = mode === 'development';
  const common = {
    devIndicators: false as const,
    poweredByHeader: false,
    env: { NEXT_PUBLIC_API_URL: development ? '/backend' : apiUrl.replace(/\/$/, '') },
  };
  if (!development) {
    if (apiUrl && !/^https?:\/\//.test(apiUrl))
      throw new Error(
        '生产环境 NEXT_PUBLIC_API_URL 必须填写后端 HTTP(S) origin，不能使用开发代理路径。',
      );
    return { ...common, rewrites: undefined };
  }
  const proxy = new URL(target);
  if (
    !['http:', 'https:'].includes(proxy.protocol) ||
    proxy.username ||
    proxy.password ||
    proxy.search ||
    proxy.hash ||
    proxy.pathname !== '/'
  )
    throw new Error('DEV_API_PROXY_TARGET 必须是后端 HTTP(S) origin，例如 http://127.0.0.1:8000');
  return {
    ...common,
    experimental: { proxyTimeout: 120000 },
    rewrites: async () => [{ source: '/backend/:path*', destination: `${proxy.origin}/:path*` }],
  };
}
