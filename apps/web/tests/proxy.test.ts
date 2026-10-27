import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBackendUrl } from '../src/services/backend-url';
import { createWebConfig } from '../web-config';

test('local HTTP and WebSocket paths use the frontend origin and proxy prefix', () => {
  assert.equal(
    resolveBackendUrl('/api/health', '/backend', 'http://localhost:3002'),
    'http://localhost:3002/backend/api/health',
  );
  assert.equal(
    resolveBackendUrl('/ws/sessions/test', '/backend', 'http://localhost:3002'),
    'http://localhost:3002/backend/ws/sessions/test',
  );
  assert.equal(
    resolveBackendUrl('/api/health', 'https://api.example.com', 'http://localhost:3002'),
    'https://api.example.com/api/health',
  );
});

test('only development config registers the local backend proxy', async () => {
  const dev = createWebConfig(
    'development',
    'http://127.0.0.1:8000',
    'https://production.example.com',
  );
  assert.equal(dev.env?.NEXT_PUBLIC_API_URL, '/backend');
  assert.deepEqual(await dev.rewrites!(), [
    { source: '/backend/:path*', destination: 'http://127.0.0.1:8000/:path*' },
  ]);
  const prod = createWebConfig('production', 'http://127.0.0.1:8000', 'https://api.example.com');
  assert.equal(prod.env?.NEXT_PUBLIC_API_URL, 'https://api.example.com');
  assert.equal(prod.rewrites, undefined);
});
