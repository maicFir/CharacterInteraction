import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
test('scene UI and runtime use the service-hook boundary rather than constructing requests', () => {
  const root = path.resolve('src/features/scene');
  assert.ok(fs.existsSync(root), 'scene feature should own its UI and runtime');
  for (const file of sourceFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|new WebSocket\s*\(/, file);
    assert.doesNotMatch(source, /from ['"][^'"]*(?:scene\.transport|http-client)['"]/, file);
  }
});
test('public UI components have no scene-store or API dependencies', () => {
  const root = path.resolve('src/components/ui');
  assert.ok(fs.existsSync(root), 'shared UI folder should exist');
  for (const file of sourceFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from ['"][^'"]*(?:features\/scene|services)[^'"]*['"]/, file);
  }
});
