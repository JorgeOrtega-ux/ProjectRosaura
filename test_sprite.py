import math
import os

icons = ['home', 'search', 'settings']
# Pretend we have SVGs for these
svgs = [
    '<path d="M100,-100 L200,-200 Z" />', # Fake path
    '<path d="M300,-300 L400,-400 Z" />',
    '<path d="M500,-500 L600,-600 Z" />'
]

COLS = 2
ROWS = math.ceil(len(icons) / COLS)

svg_content = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {COLS * 960} {ROWS * 960}">']
css_content = [
    ".msr {",
    "  display: inline-block;",
    "  width: 1em;",
    "  height: 1em;",
    "  background-color: currentColor;",
    "  -webkit-mask-image: url('/public/assets/icons/sprite.svg');",
    "  mask-image: url('/public/assets/icons/sprite.svg');",
    f"  -webkit-mask-size: {COLS * 100}% {ROWS * 100}%;",
    f"  mask-size: {COLS * 100}% {ROWS * 100}%;",
    "}"
]

for idx, (icon, path) in enumerate(zip(icons, svgs)):
    col = idx % COLS
    row = idx // COLS
    
    transform = f"translate({col * 960}, {row * 960 + 960})"
    svg_content.append(f'  <g transform="{transform}">{path}</g>')
    
    x_pos = 0 if COLS == 1 else (col / (COLS - 1)) * 100
    y_pos = 0 if ROWS == 1 else (row / (ROWS - 1)) * 100
    
    css_content.append(f".msr-{icon} {{")
    css_content.append(f"  -webkit-mask-position: {x_pos:.4f}% {y_pos:.4f}%;")
    css_content.append(f"  mask-position: {x_pos:.4f}% {y_pos:.4f}%;")
    css_content.append("}")

svg_content.append('</svg>')

print("\n".join(css_content))
print("\n" + "\n".join(svg_content))
