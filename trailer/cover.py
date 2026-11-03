# Key art for the itch.io cover (1260x1000, shown at 630x500), built from the game's own pixel art.
# Parts come from trailer/out/cover/ (planet renders and machine sprites exported from the game at full design size).
# Usage: python3 cover.py A|B|C [out.png]
import json, math, random, sys
from PIL import Image, ImageDraw, ImageFont

HERE = __file__.rsplit('/', 1)[0] or '.'
PARTS, FONT = f'{HERE}/out/cover/', f'{HERE}/out/VT323.ttf'
W, H = 1260, 1000
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
INK, AMBER, DIM = (239, 232, 218), (255, 181, 71), (154, 162, 182)


def part(name, flip=False):
    im = Image.open(PARTS + name + '.png').convert('RGBA')
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im


def noise(x, y, s=1):
    v = math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453
    return v - math.floor(v)


def vnoise(x, y, scale, s):
    gx, gy = x / scale, y / scale
    x0, y0 = math.floor(gx), math.floor(gy)
    fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = noise(x0, y0, s), noise(x0 + 1, y0, s), noise(x0, y0 + 1, s), noise(x0 + 1, y0 + 1, s)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def mix(a, b, k):
    return tuple(round(a[i] + (b[i] - a[i]) * k) for i in range(3))


def sky(gw, gh, top, bottom, glow=None):
    """Night sky on the art grid: a dithered vertical gradient, an optional dithered glow, sparse stars."""
    im = Image.new('RGBA', (gw, gh))
    px = im.load()
    rnd = random.Random(7)
    for y in range(gh):
        for x in range(gw):
            t = y / (gh - 1) + (BAYER[y & 3][x & 3] / 16 - .5) * .12
            col = mix(top, bottom, max(0, min(1, t)))
            if glow:
                gx, gy, gr, gc, gk = glow
                d = math.hypot(x - gx, (y - gy) * 1.15) / gr
                k = max(0, 1 - d) ** 1.6 * gk + (BAYER[y & 3][x & 3] / 16 - .5) * .06
                col = mix(col, gc, max(0, min(1, k)))
            px[x, y] = col + (255,)
    for _ in range(gw * gh // 70):
        x, y = rnd.randrange(gw), rnd.randrange(gh)
        b = rnd.random()
        px[x, y] = (mix((70, 78, 100), INK, b ** 3) + (255,))
    return im


def planet(world, cx, cy, gw, gh, split_angle, front_seed=3, front=True, light=(.8, -.6), shift=0):
    """The planet, alive on one side of a jagged healing front and dead on the other, with a stepped atmosphere halo."""
    glow = json.load(open(PARTS + 'glow.json'))[str(world)]
    alive, dead = part(f'planet-{world}-alive'), part(f'planet-{world}-dead')
    r = alive.width // 2
    layer = Image.new('RGBA', (gw, gh))
    lp = layer.load()
    ap, dp = alive.load(), dead.load()
    nx, ny = math.cos(split_angle), math.sin(split_angle)
    seam = []
    # halo: three soft steps outside the rim, alive colour on the living side
    for y in range(max(0, cy - r - 14), min(gh, cy + r + 14)):
        for x in range(max(0, cx - r - 14), min(gw, cx + r + 14)):
            d = math.hypot(x - cx, y - cy)
            if r <= d < r + 13:
                side = (x - cx) * nx + (y - cy) * ny + shift + (vnoise(x, y, 9, front_seed) - .5) * 40
                col = glow['ag'] if side > 0 else glow['dg']
                step = int((d - r) / 4.4)
                a = [120, 64, 30][min(2, step)] * (1 if side > 0 else .55)
                if BAYER[y & 3][x & 3] / 16 < .85:
                    lp[x, y] = tuple(col) + (int(a),)
    for y in range(2 * r):
        for x in range(2 * r):
            gx, gy = cx - r + x, cy - r + y
            if not (0 <= gx < gw and 0 <= gy < gh):
                continue
            if ap[x, y][3] == 0:
                continue
            side = (x - r) * nx + (y - r) * ny + shift + (vnoise(gx, gy, 9, front_seed) - .5) * 40 + (vnoise(gx, gy, 3, front_seed + 1) - .5) * 10  # shift: how far the front has spread
            px_ = ap[x, y] if side > 0 else dp[x, y]
            if front and abs(side) < 2.2:
                seam.append((gx, gy))
            # an off-frame sun: the lit limb stays bright, the far side falls into a dithered night in three hard steps
            face = (x - r) / r * light[0] + (y - r) / r * light[1] + (BAYER[gy & 3][gx & 3] / 16 - .5) * .25
            k = 1 if face > .05 else .74 if face > -.3 else .5 if face > -.6 else .3
            lp[gx, gy] = tuple(round(c * k) for c in px_[:3]) + (255,)
    # the healing front burns: white-hot core, amber and ember around it
    for (x, y) in seam:
        k = noise(x, y, 5)
        lp[x, y] = ((255, 244, 214, 255) if k < .35 else (255, 181, 71, 255) if k < .8 else (220, 90, 40, 255))
    return layer, seam


def put(base, sprite, x, y, scale=1):
    if scale != 1:
        sprite = sprite.resize((sprite.width * scale, sprite.height * scale), Image.NEAREST)
    base.alpha_composite(sprite, (int(x - sprite.width / 2), int(y - sprite.height / 2)))


def line(img, x0, y0, x1, y1, col, every=1, on=1):
    px = img.load()
    n = int(max(abs(x1 - x0), abs(y1 - y0)))
    for i in range(n + 1):
        if (i // on) % every:
            continue
        x, y = round(x0 + (x1 - x0) * i / max(1, n)), round(y0 + (y1 - y0) * i / max(1, n))
        if 0 <= x < img.width and 0 <= y < img.height:
            px[x, y] = col + (255,)


def sparks(img, x, y, n, cols, spread, seed):
    rnd = random.Random(seed)
    px = img.load()
    for _ in range(n):
        a, d = rnd.random() * 2 * math.pi, rnd.random() ** 1.5 * spread
        qx, qy = round(x + math.cos(a) * d), round(y + math.sin(a) * d)
        if 0 <= qx < img.width and 0 <= qy < img.height:
            px[qx, qy] = rnd.choice(cols) + (255,)


def finish(art, scale):
    """Scale the art grid up with whole pixels, then a soft vignette and fine grain at full size."""
    big = art.resize((art.width * scale, art.height * scale), Image.NEAREST).convert('RGB')
    big = big.crop((0, 0, W, H))
    vig = Image.new('L', (W, H))
    vp = vig.load()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            d = math.hypot((x - W / 2) / (W * .62), (y - H / 2) / (H * .62))
            v = int(max(0, min(1, (d - .55) / .6)) * 150)
            vp[x, y] = vp[min(W - 1, x + 1), y] = vp[x, min(H - 1, y + 1)] = vp[min(W - 1, x + 1), min(H - 1, y + 1)] = v
    big = Image.composite(Image.new('RGB', (W, H), (4, 5, 8)), big, vig)
    rnd = random.Random(1)
    px = big.load()
    for _ in range(W * H // 6):
        x, y, g = rnd.randrange(W), rnd.randrange(H), rnd.randint(-7, 7)
        p = px[x, y]
        px[x, y] = (max(0, min(255, p[0] + g)), max(0, min(255, p[1] + g)), max(0, min(255, p[2] + g)))
    return big


def title(img, x, y, size, tag, tag_size, align='left', gap=10):
    d = ImageDraw.Draw(img)
    d.fontmode = '1'
    f, ft = ImageFont.truetype(FONT, size), ImageFont.truetype(FONT, tag_size)

    def spaced(text, font, track):
        widths = [font.getlength(c) for c in text]
        return widths, sum(widths) + track * (len(text) - 1)

    tw, total = spaced('TERRAFORM', f, size * .08)
    gw_, gtotal = spaced(tag, ft, tag_size * .22)
    width = max(total, gtotal)
    x0 = x - total / 2 if align == 'center' else x
    heavy = max(1, round(size * .03))
    for dx, dy, col in [(0, size * .045, (6, 7, 11)), (0, 0, INK)]:  # a hard drop shadow, then the letters, drawn heavy
        cx = x0
        for c, w in zip('TERRAFORM', tw):
            for b in range(heavy + 1):
                d.text((cx + dx + b, y + dy), c, font=f, fill=col)
            cx += w + size * .08
    ty = y + size * .86 + gap
    rule_w = total
    rx = x0
    d.rectangle((rx, ty, rx + rule_w, ty + max(3, size // 48)), fill=AMBER)  # a thin amber rule under the title
    ty += size // 48 + gap
    gx = x - gtotal / 2 if align == 'center' else x
    for c, w in zip(tag, gw_):
        d.text((gx, ty), c, font=ft, fill=AMBER if align == 'left' else DIM)
        gx += w + tag_size * .22


def variant_a():
    gw, gh, k = 315, 250, 4  # art grid, scaled x4
    art = sky(gw, gh, (6, 7, 12), (14, 16, 24), glow=(300, 160, 170, (60, 34, 24), .5))
    layer, seam = planet(11, 250, 232, gw, gh, math.radians(18), front_seed=4, shift=58)
    art.alpha_composite(layer)
    # machines on the dead side, aimed at the planet: gatling and harpoon mirrored to face right
    gat, har = part('m-gatling-2', True), part('m-harpoon-0', True)
    put(art, har, 44, 150)
    put(art, gat, 104, 112)
    # gatling tracers into the dead crust, harpoon chain into the rock
    for i, (tx, ty) in enumerate([(150, 168), (158, 176), (146, 181)]):
        line(art, 104 + 29, 112 + 17, tx, ty, AMBER, every=3, on=2)
        sparks(art, tx, ty, 10, [(255, 244, 214), AMBER, (220, 90, 40)], 5, i)
    line(art, 44 + 30, 150 + 17, 118, 214, (110, 112, 120), every=2)
    sparks(art, 118, 214, 14, [INK, AMBER, DIM], 6, 9)
    img = finish(art, k)
    title(img, 72, 54, 168, 'HEAL TWELVE DEAD WORLDS', 46)
    return img


def variant_b():
    gw, gh, k = 252, 200, 5  # art grid, scaled x5
    art = sky(gw, gh, (5, 6, 10), (16, 14, 20), glow=(126, 200, 170, (60, 30, 22), .5))
    layer, seam = planet(9, 126, 232, gw, gh, math.radians(0), front_seed=2)
    art.alpha_composite(layer)
    bom, grav, gat, lan = part('m-bomber-0'), part('m-grav-2'), part('m-gatling-0'), part('m-lance-2', True)
    put(art, grav, 126, 96)
    put(art, gat, 214, 92)
    put(art, lan, 38, 92)
    line(art, 126, 96 + 13, 126, 150, (201, 168, 255), every=2)
    for r_ in (6, 10):
        for a in range(0, 360, 12):
            x, y = 126 + math.cos(math.radians(a)) * r_, 152 + math.sin(math.radians(a)) * r_ * .6
            if 0 <= y < gh: art.load()[round(x), round(y)] = (201, 168, 255, 255)
    for i, (tx, ty) in enumerate([(170, 140), (176, 146)]):
        line(art, 214 - 28, 92 + 16, tx, ty, AMBER, every=3, on=2)
        sparks(art, tx, ty, 10, [(255, 244, 214), AMBER], 5, i)
    line(art, 38 + 30, 92 + 17, 84, 142, (197, 140, 255))
    line(art, 38 + 31, 92 + 17, 85, 142, (197, 140, 255))
    sparks(art, 84, 142, 14, [INK, (197, 140, 255)], 6, 4)
    img = finish(art, k)
    title(img, W / 2, 46, 176, 'HEAL TWELVE DEAD WORLDS', 46, align='center')
    return img


def variant_c():
    gw, gh, k = 252, 200, 5
    art = sky(gw, gh, (6, 6, 10), (18, 12, 14), glow=(190, 120, 120, (90, 30, 20), .6))
    layer, seam = planet(0, 190, 120, gw, gh, math.radians(200), front_seed=6)
    art.alpha_composite(layer)
    gat = part('m-gatling-2', True)
    put(art, gat, 54, 150, 2)  # one heavy gun up close, at double size
    for i, (tx, ty) in enumerate([(120, 120), (128, 128), (116, 132), (124, 112)]):
        line(art, 54 + 56, 150 + 32, tx, ty, AMBER, every=3, on=2)
        sparks(art, tx, ty, 12, [(255, 244, 214), AMBER, (220, 90, 40)], 6, i)
    img = finish(art, k)
    title(img, 64, 820, 132, 'HEAL TWELVE DEAD WORLDS', 40, gap=8)
    return img


if __name__ == '__main__':
    v = sys.argv[1] if len(sys.argv) > 1 else 'A'
    img = {'A': variant_a, 'B': variant_b, 'C': variant_c}[v]()
    img.save(sys.argv[2] if len(sys.argv) > 2 else f'{HERE}/../itch/cover-{v}.png')
