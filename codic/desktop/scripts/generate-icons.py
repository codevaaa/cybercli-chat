from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "brand"
SIZE = 1024
SCALE = 4
S = SIZE * SCALE
canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)
scale = lambda values: tuple(round(value * SCALE) for value in values)

# Warm graphite tile, softly bevelled at the edge.
draw.rounded_rectangle(scale((34, 34, SIZE - 34, SIZE - 34)), radius=220 * SCALE, fill="#111510", outline="#343b33", width=9 * SCALE)
draw.rounded_rectangle(scale((52, 52, SIZE - 52, SIZE - 52)), radius=200 * SCALE, outline="#202720", width=4 * SCALE)

# Extruded C: stacked dark layers form the side wall; the brighter front face sits above them.
arc_box = (215, 207, 808, 800)
for level in range(17, 0, -1):
    shade = 39 + level * 2
    color = f"#{min(shade + 38, 92):02x}{min(shade, 74):02x}{min(shade - 8, 62):02x}"
    draw.arc(scale((arc_box[0], arc_box[1] + level * 5, arc_box[2], arc_box[3] + level * 5)), 38, 322, fill=color, width=100 * SCALE)

draw.arc(scale(arc_box), 38, 322, fill="#d36f50", width=98 * SCALE)
draw.arc(scale((arc_box[0], arc_box[1] - 4, arc_box[2], arc_box[3] - 4)), 46, 290, fill="#f4a27f", width=12 * SCALE)
draw.arc(scale((arc_box[0] + 10, arc_box[1] + 10, arc_box[2] - 10, arc_box[3] - 10)), 48, 288, fill="#f8b999", width=5 * SCALE)

# A raised round signal sits in the C's open end, so the mark reads clearly at taskbar size.
draw.ellipse(scale((749, 460, 861, 572)), fill="#592f27")
draw.ellipse(scale((742, 440, 850, 548)), fill="#f0a07d")
draw.ellipse(scale((758, 456, 834, 532)), fill="#cc694b")
draw.ellipse(scale((772, 468, 795, 491)), fill="#ffd2b5")
draw.arc(scale((754, 452, 840, 538)), 205, 315, fill="#a84f3c", width=8 * SCALE)

image = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
OUTPUT.mkdir(parents=True, exist_ok=True)
image.save(OUTPUT / "codic-icon.png", optimize=True)
image.save(OUTPUT / "codic-icon.ico", format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
image.save(OUTPUT / "codic-icon.icns", format="ICNS")
