#!/usr/bin/env node

/** Stamps a WXT-generated manifest without modifying source files. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argumentIndex = process.argv.indexOf('--manifest');
const manifestArgument = argumentIndex === -1 ? undefined : process.argv[argumentIndex + 1];
const stateIndex = process.argv.indexOf('--state');
const stateArgument = stateIndex === -1 ? undefined : process.argv[stateIndex + 1];

/**
 * Stops stamping with a clear error.
 *
 * @param {string} message - Failure explanation.
 * @returns {never} Never returns.
 */
function fail(message) {
  console.error(`Stamp failed: ${message}`);
  process.exit(1);
}

/**
 * Reads a JSON object.
 *
 * @param {string} path - JSON file path.
 * @returns {Record<string, unknown>} Parsed object.
 */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!manifestArgument) fail('pass the generated manifest with --manifest <path>');
const manifestPath = resolve(manifestArgument);
const statePath = resolve(stateArgument ?? dirname(manifestPath), stateArgument ? '' : '.dev-stamp.json');
if (!existsSync(manifestPath)) fail(`generated manifest was not found at ${manifestPath}`);

const manifest = readJson(manifestPath);
if (typeof manifest.version !== 'string' || !manifest.version) fail('manifest version is missing');
const previousState = existsSync(statePath) ? readJson(statePath) : {};
const previousCount = previousState.version === manifest.version && Number.isInteger(previousState.count) ? previousState.count : 0;
const nextState = { version: manifest.version, count: previousCount + 1 };

manifest.version_name = `${manifest.version}-d${nextState.count}`;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
mkdirSync(dirname(statePath), { recursive: true });
writeFileSync(statePath, `${JSON.stringify(nextState, null, 2)}\n`);
console.log(`Stamped ${manifestPath} as ${manifest.version_name}`);
