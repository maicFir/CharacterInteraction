import type { NextConfig } from 'next';
import { createWebConfig } from './web-config';

const config: NextConfig = createWebConfig(
  process.env.NODE_ENV,
  process.env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:8000',
  process.env.NEXT_PUBLIC_API_URL || '',
);
export default config;
