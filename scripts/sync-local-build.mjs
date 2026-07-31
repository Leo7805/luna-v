#!/usr/bin/env node

/** Copies a WXT Chrome MV3 build into a Finder-visible project directory. */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const configPath = resolve(root, 'wxt.config.ts');
const config = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
const outDir = config.match(/\boutDir\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? '.output';
const source = resolve(root, outDir, 'chrome-mv3');
const name = String(packageJson.name ?? '').replace(/[^a-zA-Z0-9._-]/g, '-');
const destination = resolve(root, 'build', name);

if (!name || !existsSync(resolve(source, 'manifest.json'))) {
  throw new Error('Expected a WXT Chrome MV3 build before synchronizing local output');
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
console.log(`Synchronized ${source} to ${destination}`);
