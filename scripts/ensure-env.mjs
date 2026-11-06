#!/usr/bin/env node
/**
 * Гарантирует наличие .env: копирует .env.example, если .env не создан.
 * Это позволяет запускать `npm install && npm run dev` одной командой.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const examplePath = join(root, '.env.example');

if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    console.error('[ensure-env] .env.example не найден — невозможно создать .env');
    process.exit(1);
  }
  copyFileSync(examplePath, envPath);
  console.log('[ensure-env] создан .env из .env.example');
} else {
  console.log('[ensure-env] .env уже существует');
}
