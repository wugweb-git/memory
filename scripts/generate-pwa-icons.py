"""Generate PWA icons from public/bot.png. Run from repo root: python3 scripts/generate-pwa-icons.py"""
from PIL import Image

BG = (245, 245, 240, 255)  # --bg-primary
src = Image.open("public/bot.png").convert("RGBA")


def make(size, scale, path):
    canvas = Image.new("RGBA", (size, size), BG)
    s = int(size * scale)
    img = src.resize((s, s), Image.LANCZOS)
    canvas.alpha_composite(img, ((size - s) // 2, (size - s) // 2))
    canvas.convert("RGB").save(path, optimize=True)


make(192, 0.86, "public/icons/icon-192.png")
make(512, 0.86, "public/icons/icon-512.png")
make(512, 0.62, "public/icons/icon-maskable-512.png")  # inside the 80% safe zone
make(180, 0.86, "public/apple-touch-icon.png")
