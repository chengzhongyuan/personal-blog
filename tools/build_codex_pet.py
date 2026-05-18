from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


CELL_W = 192
CELL_H = 208
ROWS = [
    ("idle", 6),
    ("running-right", 8),
    ("running-left", 8),
    ("waving", 4),
    ("jumping", 5),
    ("failed", 8),
    ("waiting", 6),
    ("running", 6),
    ("review", 6),
]


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=None, width=1):
    draw.ellipse(tuple(round(v) for v in box), fill=fill, outline=outline, width=width)


def polygon(draw: ImageDraw.ImageDraw, points, fill, outline=None):
    draw.polygon([(round(x), round(y)) for x, y in points], fill=fill, outline=outline)


def arc(draw: ImageDraw.ImageDraw, box, start, end, fill, width=1):
    x0, y0, x1, y1 = box
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0
    draw.arc(tuple(round(v) for v in (x0, y0, x1, y1)), start, end, fill=fill, width=width)


def draw_pet(state: str, frame: int, total: int, facing: int = 1) -> Image.Image:
    scale = 4
    img = Image.new("RGBA", (CELL_W * scale, CELL_H * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    t = frame / max(total, 1)
    cx = CELL_W * scale / 2
    base_y = 166 * scale

    bob = math.sin(t * math.tau) * 3 * scale
    squash_x = 1.0
    squash_y = 1.0
    arm_lift = 0
    eye_scale = 1.0
    mouth = "smile"
    tilt = math.sin(t * math.tau) * 2
    work_paws = False
    sad = False

    if state == "idle":
        bob = math.sin(t * math.tau) * 2 * scale
        eye_scale = 0.12 if frame == 3 else 1.0
    elif state in {"running-right", "running-left"}:
        facing = 1 if state == "running-right" else -1
        bob = abs(math.sin(t * math.tau)) * -5 * scale
        tilt = facing * math.sin(t * math.tau) * 7
    elif state == "waving":
        arm_lift = -50 * scale if frame % 2 else -26 * scale
        bob = -2 * scale if frame % 2 else 1 * scale
        mouth = "open"
    elif state == "jumping":
        jumps = [0, -32, -46, -22, 0]
        bob = jumps[frame % len(jumps)] * scale
        squash_y = 0.92 if frame in {0, 4} else 1.04
        squash_x = 1.08 if frame in {0, 4} else 0.98
        mouth = "open"
    elif state == "failed":
        bob = math.sin(t * math.tau) * 2 * scale
        eye_scale = 0.55
        mouth = "frown"
        sad = True
        tilt = -5 + math.sin(t * math.tau) * 3
    elif state == "waiting":
        bob = math.sin(t * math.tau) * 2 * scale
        tilt = math.sin(t * math.tau) * 8
        mouth = "small"
    elif state == "running":
        bob = math.sin(t * math.tau * 2) * 3 * scale
        work_paws = True
        eye_scale = 0.75
        mouth = "small"
    elif state == "review":
        bob = 0
        tilt = -9 + math.sin(t * math.tau) * 2
        eye_scale = 0.72
        mouth = "small"

    ox = cx
    oy = base_y + bob
    if state in {"running-right", "running-left"}:
        ox += math.sin(t * math.tau) * 8 * scale

    body_blue = (42, 132, 216, 255)
    head_blue = (55, 154, 232, 255)
    dark_blue = (19, 82, 163, 255)
    belly = (137, 207, 247, 255)
    ear_inner = (118, 188, 240, 255)
    ink = (9, 24, 41, 255)
    white = (255, 255, 255, 255)
    cheek = (105, 184, 238, 255)

    def tx(x: float, y: float) -> tuple[float, float]:
        x = (x - CELL_W / 2) * squash_x
        y = (y - 150) * squash_y
        rad = math.radians(tilt)
        rx = x * math.cos(rad) - y * math.sin(rad)
        ry = x * math.sin(rad) + y * math.cos(rad)
        return ox + facing * rx * scale, oy + ry * scale

    def draw_ellipse(cx0, cy0, rx, ry, fill, outline=dark_blue, width=3):
        x1, y1 = tx(cx0 - rx, cy0 - ry)
        x2, y2 = tx(cx0 + rx, cy0 + ry)
        if x1 > x2:
            x1, x2 = x2, x1
        ellipse(d, (x1, y1, x2, y2), fill, outline, width * scale)

    # Ears.
    left_ear = [tx(60, 92), tx(21, 49), tx(29, 126), tx(65, 128)]
    right_ear = [tx(132, 92), tx(171, 49), tx(163, 126), tx(127, 128)]
    polygon(d, left_ear, body_blue, dark_blue)
    polygon(d, right_ear, body_blue, dark_blue)
    polygon(d, [tx(54, 94), tx(31, 63), tx(37, 114), tx(61, 118)], ear_inner)
    polygon(d, [tx(138, 94), tx(161, 63), tx(155, 114), tx(131, 118)], ear_inner)

    # Body, limbs, head.
    draw_ellipse(96, 148, 33, 38, body_blue)
    draw_ellipse(96, 154, 17, 22, belly, None, 1)

    step = math.sin(t * math.tau)
    leg_swing = 9 * step if state in {"running-right", "running-left"} else 0
    draw_ellipse(77 - leg_swing * 0.35, 184, 15, 10, body_blue)
    draw_ellipse(115 + leg_swing * 0.35, 184, 15, 10, body_blue)

    arm_wave = arm_lift / scale
    left_arm_y = 145 + (6 * step if state in {"running-right", "running-left"} else 0)
    right_arm_y = 145 + arm_wave + (-6 * step if state in {"running-right", "running-left"} else 0)
    if work_paws:
        left_arm_y += math.sin(t * math.tau * 3) * 4
        right_arm_y -= math.sin(t * math.tau * 3) * 4
    draw_ellipse(64, left_arm_y, 9, 23, body_blue)
    draw_ellipse(128, right_arm_y, 9, 23, body_blue)

    draw_ellipse(96, 93, 42, 38, head_blue)
    draw_ellipse(78, 105, 8, 6, cheek, None, 1)
    draw_ellipse(114, 105, 8, 6, cheek, None, 1)

    # Tuft.
    polygon(d, [tx(93, 58), tx(103, 43), tx(105, 62)], head_blue, dark_blue)

    # Face.
    eye_h = 10 * eye_scale
    draw_ellipse(79, 91, 7, eye_h, ink, None, 1)
    draw_ellipse(113, 91, 7, eye_h, ink, None, 1)
    if eye_scale > 0.3:
        draw_ellipse(76.5, 87.5, 2, 2, white, None, 1)
        draw_ellipse(110.5, 87.5, 2, 2, white, None, 1)

    draw_ellipse(96, 105, 8, 5, ink, None, 1)
    if mouth == "smile":
        arc(d, (*tx(85, 106), *tx(107, 121)), 15, 165, ink, 2 * scale)
    elif mouth == "open":
        draw_ellipse(96, 118, 8, 7, ink, None, 1)
    elif mouth == "frown":
        arc(d, (*tx(85, 119), *tx(107, 133)), 200, 340, ink, 2 * scale)
    else:
        arc(d, (*tx(89, 113), *tx(103, 120)), 20, 160, ink, 2 * scale)

    if sad:
        draw_ellipse(70, 116 + math.sin(t * math.tau) * 3, 3, 7, (82, 184, 255, 235), None, 1)
        draw_ellipse(121, 116 - math.sin(t * math.tau) * 2, 3, 7, (82, 184, 255, 235), None, 1)

    if state == "waiting":
        draw_ellipse(75, 80, 2, 2, white, None, 1)
        draw_ellipse(117, 80, 2, 2, white, None, 1)

    if state == "running":
        draw_ellipse(96 + math.sin(t * math.tau * 2) * 8, 166, 11, 6, belly, dark_blue, 2)

    if state == "review":
        # Attached paw-on-chin pose, no separate props.
        draw_ellipse(119, 120, 9, 8, body_blue)

    return img.resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)


def make_outputs(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * 9), (0, 0, 0, 0))

    for row_index, (state, count) in enumerate(ROWS):
        for frame in range(count):
            sprite = draw_pet(state, frame, count)
            atlas.alpha_composite(sprite, (frame * CELL_W, row_index * CELL_H))

    png = out_dir / "spritesheet.png"
    webp = out_dir / "spritesheet.webp"
    atlas.save(png)
    atlas.save(webp, "WEBP", lossless=True, quality=100, method=6)

    pet = {
        "id": "blue-alien-stitch",
        "displayName": "史迪仔风蓝色外星宠",
        "description": "A playful blue alien Codex desktop pet with big ears and expressive animations.",
        "spritesheetPath": "spritesheet.webp",
    }
    (out_dir / "pet.json").write_text(json.dumps(pet, ensure_ascii=False, indent=2), encoding="utf-8")

    contact = Image.new("RGBA", (CELL_W * 8, CELL_H * 9), (245, 247, 250, 255))
    contact.alpha_composite(atlas)
    contact.save(out_dir / "contact-sheet.png")

    validation = {
        "ok": True,
        "size": list(atlas.size),
        "cell": [CELL_W, CELL_H],
        "rows": [{"name": name, "frames": count} for name, count in ROWS],
        "unused_cells_transparent": True,
    }
    (out_dir / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("codex-pet-blue-alien")
    make_outputs(target)
