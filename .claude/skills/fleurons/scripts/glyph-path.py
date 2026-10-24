# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools"]
# ///
"""Print a font glyph as an SVG path for the EPUB ornaments in src/epub/pages.ts.

The outline is flipped to SVG's y-down axis and moved so its bounding box
starts at 0,0; the box's width and height are the viewBox size.

Usage: uv run glyph-path.py FONT CODEPOINT   (e.g. U+1F658, 1F658 or 0x1F658)
"""

import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont


def parse_codepoint(text: str) -> int:
    text = text.upper().removeprefix("U+").removeprefix("0X")
    return int(text, 16)


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    font = TTFont(sys.argv[1])
    codepoint = parse_codepoint(sys.argv[2])
    name = font.getBestCmap().get(codepoint)
    if name is None:
        sys.exit(f"U+{codepoint:04X} is not in {sys.argv[1]}")
    glyphs = font.getGlyphSet()
    bounds = BoundsPen(glyphs)
    glyphs[name].draw(bounds)
    x_min, y_min, x_max, y_max = bounds.bounds
    svg = SVGPathPen(glyphs, ntos=lambda n: f"{n:g}")
    glyphs[name].draw(TransformPen(svg, (1, 0, 0, -1, -x_min, y_max)))
    width, height = x_max - x_min, y_max - y_min
    print(f"glyph: {name}")
    print(f"viewBox: 0 0 {width:g} {height:g}")
    print(f"aspect: {height:g} / {width:g}")
    print(f"path: {svg.getCommands()}")


if __name__ == "__main__":
    main()
