// Screenshots each group of the settings tab, with Obsidian's default light
// theme, into docs/screenshots/settings-<group>.png.
// The README links to these files, so they stay current without editing it.
//
// Needs a built main.js (`npm run build`) and a display; on a headless Linux
// machine, run it under `xvfb-run -a`.
import ObsidianLauncher from 'obsidian-launcher';
import CDP from 'chrome-remote-interface';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// Pinned, so the screenshots change only when the settings do.
const OBSIDIAN_VERSION = '1.14.5';
const PORT = 9333;
const VIEWPORT = { width: 1280, height: 2400, deviceScaleFactor: 2 };
// The settings window: narrow, to keep the images small, and tall enough to
// show the longest group in full.
const MODAL = { width: 610, height: 2200 };
// Room around each group, in CSS pixels.
const MARGIN = 16;
const OUTDIR = 'docs/screenshots';

// Shows every setting: a group property reveals the group settings.
const PLUGIN_DATA = {
	groupProperty: 'song-status',
	groups: 'learning, polishing',
	bookId: 'screenshots',
};

const GROUPS = `[...app.setting.activeTab.containerEl.querySelectorAll('.setting-group')]`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(what, attempt) {
	for (let i = 0; i < 120; i++) {
		try {
			const result = await attempt();
			if (result) return result;
		} catch {
			// Not ready yet.
		}
		await sleep(500);
	}
	throw new Error(`Timed out waiting for ${what}`);
}

const { id: pluginId } = JSON.parse(readFileSync('manifest.json', 'utf8'));
const launcher = new ObsidianLauncher();
const emptyVault = mkdtempSync(join(tmpdir(), 'songbook-screenshots-'));
const vault = await launcher.setupVault({
	vault: emptyVault,
	copy: true,
	plugins: [process.cwd()],
});
writeFileSync(
	join(vault, '.obsidian', 'plugins', pluginId, 'data.json'),
	JSON.stringify(PLUGIN_DATA),
);

const { proc, configDir } = await launcher.launch({
	appVersion: OBSIDIAN_VERSION,
	installerVersion: OBSIDIAN_VERSION,
	vault,
	// The sandbox can't start on CI runners, and isn't needed for a test vault.
	args: [`--remote-debugging-port=${PORT}`, '--no-sandbox'],
});

let client;
try {
	client = await waitFor('Obsidian', async () => {
		const targets = await CDP.List({ port: PORT });
		const target = targets.find((t) => t.type === 'page' && t.url.startsWith('app://'));
		return target && (await CDP({ port: PORT, target }));
	});

	const evaluate = async (expression) => {
		const { result, exceptionDetails } = await client.Runtime.evaluate({
			expression,
			awaitPromise: true,
			returnByValue: true,
		});
		if (exceptionDetails) {
			throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
		}
		return result.value;
	};

	await waitFor('the plugin', () =>
		evaluate(`app.workspace.layoutReady && !!app.plugins.plugins['${pluginId}']`),
	);
	await client.Emulation.setDeviceMetricsOverride({ ...VIEWPORT, mobile: false });

	// Settings open in a modal rather than a separate window, so they render
	// in this page; the viewport is tall enough to show every group in full.
	await evaluate(`
		app.setting.shouldUsePopout = () => false;
		app.setting.open();
		app.setting.openTabById('${pluginId}');
		document.activeElement?.blur();
		Object.assign(app.setting.modalEl.style, {
			width: '${MODAL.width}px',
			height: '${MODAL.height}px',
			maxWidth: 'none',
			maxHeight: 'none',
		});
	`);
	// The light theme, whatever the system's, once the modal has opened.
	await evaluate(`document.body.classList.replace('theme-dark', 'theme-light')`);
	await sleep(1000);

	// Groups that were renamed or removed leave no stale images behind.
	rmSync(OUTDIR, { recursive: true, force: true });
	mkdirSync(OUTDIR, { recursive: true });
	const count = await evaluate(`${GROUPS}.length`);
	for (let i = 0; i < count; i++) {
		// The settings scroll inside the modal: bring the group into view.
		const { heading, x, y, width, height, visibleTop, visibleBottom, visibleRight } = await evaluate(`(() => {
			const group = ${GROUPS}[${i}];
			let scroller = group.parentElement;
			while (scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
			const visible = scroller.getBoundingClientRect();
			// Short of the scrollbar.
			const visibleRight = visible.left + scroller.clientWidth;
			scroller.scrollTop += group.getBoundingClientRect().top - visible.top - ${2 * MARGIN};
			const { x, y, width, height } = group.getBoundingClientRect();
			const heading = group.querySelector('.setting-item-heading')?.textContent ?? '';
			return { heading, x, y, width, height, visibleTop: visible.top, visibleBottom: visible.bottom, visibleRight };
		})()`);
		if (!heading) throw new Error('Settings group without a heading');
		if (y - MARGIN < visibleTop || y + height + MARGIN > visibleBottom) {
			throw new Error(`Settings group ${heading} is too tall for the viewport`);
		}
		const { data } = await client.Page.captureScreenshot({
			format: 'png',
			clip: {
				x: x - MARGIN,
				y: y - MARGIN,
				width: Math.min(width + 2 * MARGIN, visibleRight - x + MARGIN),
				height: height + 2 * MARGIN,
				scale: 1,
			},
		});
		const slug = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		const file = join(OUTDIR, `settings-${slug}.png`);
		writeFileSync(file, Buffer.from(data, 'base64'));
		console.log(file);
	}
} finally {
	await client?.close();
	// Obsidian writes to its config dir until it exits.
	const exited = new Promise((resolve) => proc.once('exit', resolve));
	if (proc.kill()) await exited;
	for (const dir of [emptyVault, vault, configDir]) rmSync(dir, { recursive: true, force: true });
}
