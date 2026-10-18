"""生成 build/icon.png (1024) 与 build/icon.ico（多尺寸），仅依赖 Pillow。"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
S = 1024


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gradient(size, c1, c2, angle=55):
    """线性渐变（c1 左上 -> c2 右下）。"""
    w = h = size
    img = Image.new("RGB", (w, h))
    px = img.load()
    import math
    rad = math.radians(angle)
    dx, dy = math.cos(rad), math.sin(rad)
    maxd = abs(dx) * w + abs(dy) * h
    for y in range(h):
        for x in range(w):
            d = (x * dx + y * dy) / maxd
            d = min(1.0, max(0.0, d))
            px[x, y] = lerp(c1, c2, d)
    return img


def rounded_mask(size, radius_ratio=0.22):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return m


def build(size):
    base = gradient(size, (34, 211, 238), (37, 99, 235), 55).convert("RGBA")
    mask = rounded_mask(size)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)

    # 顶部高光
    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.ellipse([-size * 0.25, -size * 0.75, size * 1.15, size * 0.42],
               fill=(255, 255, 255, 46))
    hi = hi.filter(ImageFilter.GaussianBlur(size * 0.03))
    out = Image.alpha_composite(out, Image.composite(hi, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask))

    # 文字
    if size >= 24:
        font = None
        for path, idx in ((r"C:\Windows\Fonts\msyhbd.ttc", 0),
                          (r"C:\Windows\Fonts\msyh.ttc", 0),
                          (r"C:\Windows\Fonts\simhei.ttf", 0)):
            if os.path.exists(path):
                try:
                    font = ImageFont.truetype(path, int(size * 0.56), index=idx)
                    break
                except Exception:
                    pass
        if font is None:
            font = ImageFont.load_default()
        d = ImageDraw.Draw(out)
        text = "简"
        box = d.textbbox((0, 0), text, font=font)
        tw, th = box[2] - box[0], box[3] - box[1]
        tx = (size - tw) / 2 - box[0]
        ty = (size - th) / 2 - box[1] - size * 0.01
        # 阴影
        d.text((tx + size * 0.012, ty + size * 0.014), text, font=font, fill=(0, 0, 0, 70))
        d.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    else:
        d = ImageDraw.Draw(out)
        c = size / 2
        d.ellipse([c - size * 0.2, c - size * 0.2, c + size * 0.2, c + size * 0.2],
                  fill=(255, 255, 255, 255))
    return out


big = build(S)
big.save(os.path.join(HERE, "icon.png"))
big.resize((512, 512), Image.LANCZOS).save(os.path.join(HERE, "icon-512.png"))

sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
big.save(os.path.join(HERE, "icon.ico"), sizes=sizes)

print("icon.png", os.path.getsize(os.path.join(HERE, "icon.png")), "bytes")
print("icon.ico", os.path.getsize(os.path.join(HERE, "icon.ico")), "bytes")
