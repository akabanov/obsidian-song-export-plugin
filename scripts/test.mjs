// Bundles every src/**/*.test.ts with esbuild and runs them with Node's
// built-in test runner, so tests need no extra dependencies.
import esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const outdir = '.test-build';
const entryPoints = readdirSync('src', { recursive: true })
	.filter((file) => file.endsWith('.test.ts'))
	.map((file) => join('src', file));

rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
	entryPoints,
	outdir,
	bundle: true,
	platform: 'node',
	format: 'esm',
	outExtension: { '.js': '.mjs' },
	external: ['obsidian'],
	loader: { '.jpg': 'binary' },
	sourcemap: 'inline',
	logLevel: 'warning',
});

const files = readdirSync(outdir, { recursive: true })
	.filter((file) => file.endsWith('.test.mjs'))
	.map((file) => join(outdir, file));
const { status } = spawnSync(
	process.execPath,
	['--enable-source-maps', '--test', ...files],
	{ stdio: 'inherit' },
);
process.exit(status ?? 1);
