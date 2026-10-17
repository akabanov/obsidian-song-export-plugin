import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fontFileStem } from './catalog';
import { googleFontsCssUrl, parseGoogleFontsCss } from './google';

const TTF_CSS = `@font-face {
  font-family: 'Source Serif 4';
  font-style: normal;
  font-weight: 700;
  src: url(https://fonts.gstatic.com/s/sourceserif4/v15/abc.ttf) format('truetype');
}
`;

const SUBSET_CSS = `/* cyrillic */
@font-face {
  font-family: 'Lora';
  src: url(https://fonts.gstatic.com/s/lora/v37/a.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F;
}
/* latin */
@font-face {
  font-family: 'Lora';
  src: url(https://fonts.gstatic.com/s/lora/v37/b.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
`;

describe('googleFontsCssUrl', () => {
	it('builds a css2 request for one weight', () => {
		assert.equal(
			googleFontsCssUrl('Source Serif 4', 700),
			'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@700',
		);
	});
});

describe('parseGoogleFontsCss', () => {
	it('returns the URL and format of the single font file', () => {
		assert.deepEqual(parseGoogleFontsCss(TTF_CSS), {
			url: 'https://fonts.gstatic.com/s/sourceserif4/v15/abc.ttf',
			format: 'ttf',
		});
	});

	it('accepts quoted WOFF2 URLs', () => {
		const css = "@font-face { src: url('https://x/y.woff2') format('woff2'); }";
		assert.deepEqual(parseGoogleFontsCss(css), {
			url: 'https://x/y.woff2',
			format: 'woff2',
		});
	});

	it('rejects fonts split into subsets', () => {
		assert.throws(() => parseGoogleFontsCss(SUBSET_CSS), /got 2/);
	});

	it('rejects responses without a usable font', () => {
		assert.throws(() => parseGoogleFontsCss('<html>error</html>'), /got 0/);
		assert.throws(
			() => parseGoogleFontsCss('@font-face { src: url(https://x/y.otf); }'),
			/Unsupported/,
		);
	});
});

describe('fontFileStem', () => {
	it('makes a file-name-safe stem', () => {
		assert.equal(fontFileStem('Source Serif 4', 700), 'source-serif-4-700');
	});
});
