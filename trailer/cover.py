# Key art for the itch.io cover (1260x1000, shown at 630x500), built from the game's own pixel art.
# Parts come from trailer/out/cover/ (planet renders and machine sprites exported from the game at full design size).
# Usage: python3 cover.py A|B|C [out.png]
import json, math, random, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = __file__.rsplit('/', 1)[0] or '.'
PARTS, FONT = f'{HERE}/out/cover/', f'{HERE}/out/VT323.ttf'
TAGFONT = '/usr/share/fonts/truetype/lato/Lato-Bold.ttf'  # a clean sans for the tagline, next to the pixel title
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
            t = y / (gh - 1) + (BAYER[y & 3][x & 3] / 16 - .5) * .04
            col = mix(top, bottom, max(0, min(1, t)))
            if glow:
                gx, gy, gr, gc, gk = glow
                d = math.hypot(x - gx, (y - gy) * 1.15) / gr
                k = max(0, 1 - d) ** 1.6 * gk + (BAYER[y & 3][x & 3] / 16 - .5) * .03
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


def finish(art, scale, size=(W, H)):
    """Scale the art grid up with whole pixels, then a soft vignette (no grain: the pixel art carries the texture)."""
    W, H = size
    big = art.resize((art.width * scale, art.height * scale), Image.NEAREST).convert('RGB')
    big = big.crop((0, 0, W, H))
    vig = Image.new('L', (W, H))
    vp = vig.load()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            d = math.hypot((x - W / 2) / (W * .62), (y - H / 2) / (H * .62))
            v = int(max(0, min(1, (d - .55) / .6)) * 150)
            vp[x, y] = vp[min(W - 1, x + 1), y] = vp[x, min(H - 1, y + 1)] = vp[min(W - 1, x + 1), min(H - 1, y + 1)] = v
    return Image.composite(Image.new('RGB', (W, H), (4, 5, 8)), big, vig)


def title(img, x, y, size, tag, tag_size, align='left', gap=10):
    d = ImageDraw.Draw(img)
    d.fontmode = '1'
    f, ft = ImageFont.truetype(FONT, size), ImageFont.truetype(TAGFONT, tag_size)

    def spaced(text, font, track):
        widths = [font.getlength(c) for c in text]
        return widths, sum(widths) + track * (len(text) - 1)

    tw, total = spaced('TERRAFORM', f, size * .08)
    track = tag_size * .16
    gw_, gtotal = spaced(tag, ft, track)
    width = max(total, gtotal)
    x0 = x - total / 2 if align == 'center' else x
    # the pixel title is drawn small and scaled up x4 with whole pixels, so every step of the letters is the same size
    q = 4
    fs = ImageFont.truetype(FONT, size // q)
    sw = [fs.getlength(c) for c in 'TERRAFORM']
    small = Image.new('RGBA', (int(sum(sw) + len(sw) * size * .08 / q + 8), size // q + 8))
    sd = ImageDraw.Draw(small)
    sd.fontmode = '1'
    cx = 2
    for c, w in zip('TERRAFORM', sw):
        for b in (0, 1):  # one extra pixel column: heavier strokes
            sd.text((cx + b, 1), c, font=fs, fill=INK + (255,))
        cx += w + size * .08 / q
    big = small.resize((small.width * q, small.height * q), Image.NEAREST)
    shadow = Image.new('RGBA', big.size, (6, 7, 11, 255))
    total = cx * q
    x0 = x - total / 2 if align == 'center' else x
    img.paste(shadow, (int(x0) - 8, int(y + size * .045) - 4), big)
    img.paste(big, (int(x0) - 8, int(y) - 4), big)
    ty = y + size * .86 + gap
    rule_w = total
    rx = x0
    d.rectangle((rx, ty, rx + rule_w, ty + max(3, size // 48)), fill=AMBER)  # a thin amber rule under the title
    ty += size // 48 + gap
    d.fontmode = 'L'  # the tagline is smooth type, not pixels
    gx = x - gtotal / 2 if align == 'center' else x
    for c, w in zip(tag, gw_):
        d.text((gx, ty + 2), c, font=ft, fill=(6, 7, 11))
        d.text((gx, ty), c, font=ft, fill=(214, 207, 192))
        gx += w + track


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
    title(img, 72, 54, 168, 'BRING DEAD WORLDS BACK TO LIFE', 30, gap=14)
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
    title(img, W / 2, 46, 176, 'BRING DEAD WORLDS BACK TO LIFE', 30, align='center', gap=14)
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
    title(img, 64, 820, 132, 'BRING DEAD WORLDS BACK TO LIFE', 26, gap=10)
    return img


class Glow:
    """Light on a full-resolution layer: blurred and added over the scaled pixel art, so beams and blasts light up the scene."""
    def __init__(self, k, size=(W, H)):
        self.k, self.im = k, Image.new('RGB', size)
        self.d = ImageDraw.Draw(self.im)

    def line(self, p0, p1, col, w):
        self.d.line([(p0[0] * self.k, p0[1] * self.k), (p1[0] * self.k, p1[1] * self.k)], fill=col, width=int(w * self.k))

    def dot(self, p, col, r):
        x, y = p[0] * self.k, p[1] * self.k
        self.d.ellipse((x - r * self.k, y - r * self.k, x + r * self.k, y + r * self.k), fill=col)

    def apply(self, img, blur=22, strength=1.0):
        soft = self.im.filter(ImageFilter.GaussianBlur(blur))
        wide = self.im.filter(ImageFilter.GaussianBlur(blur * 3))
        lit = ImageChops.add(soft, wide.point(lambda v: int(v * .6)))
        if strength != 1: lit = lit.point(lambda v: int(v * strength))
        return ImageChops.add(img, lit)


def beam(art, glow, p0, p1, core, edge, w=1):
    """A pixel beam: a white-hot core with coloured edges, and its light on the glow layer."""
    px = art.load()
    n = int(max(abs(p1[0] - p0[0]), abs(p1[1] - p0[1])))
    nx, ny = -(p1[1] - p0[1]), p1[0] - p0[0]
    ln = math.hypot(nx, ny) or 1
    nx, ny = nx / ln, ny / ln
    for i in range(n + 1):
        t = i / max(1, n)
        x, y = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
        for o in range(-w, w + 1):
            qx, qy = round(x + nx * o), round(y + ny * o)
            if 0 <= qx < art.width and 0 <= qy < art.height:
                px[qx, qy] = (core if abs(o) < max(1, w) * .5 else edge) + (255,)
    glow.line(p0, p1, edge, w * 2 + 3)
    glow.line(p0, p1, core, max(1, w))


def impact(art, glow, p, col, size, seed):
    px = art.load()
    x, y = round(p[0]), round(p[1])
    for dx in range(-size, size + 1):
        for dy in range(-size, size + 1):
            d = math.hypot(dx, dy)
            if d <= size and 0 <= x + dx < art.width and 0 <= y + dy < art.height:
                px[x + dx, y + dy] = ((255, 250, 235) if d < size * .5 else col) + (255,)
    sparks(art, x, y, 14 + size * 6, [(255, 244, 214), col, INK], size * 4 + 4, seed)
    glow.dot(p, col, size * 2 + 3)
    glow.dot(p, (255, 240, 210), size * .6 + .5)


def blast(art, glow, p, r, seed):
    """A warhead going off: a white core, burning rings, a shockwave and debris flung outward."""
    px = art.load()
    rnd = random.Random(seed)
    x0, y0 = p
    for y in range(int(y0 - r * 1.6), int(y0 + r * 1.6)):
        for x in range(int(x0 - r * 1.6), int(x0 + r * 1.6)):
            if not (0 <= x < art.width and 0 <= y < art.height): continue
            d = math.hypot(x - x0, (y - y0) * 1.1) + (vnoise(x, y, 3, seed) - .5) * r * .5
            if d < r * .35: col = (255, 250, 230)
            elif d < r * .6: col = (255, 214, 120)
            elif d < r * .85: col = (255, 140, 50)
            elif d < r: col = (190, 60, 30) if BAYER[y & 3][x & 3] / 16 < .7 else None
            else: col = None
            if col: px[x, y] = col + (255,)
    for a in range(0, 360, 3):  # shockwave ring
        rr = r * 1.45
        x, y = round(x0 + math.cos(math.radians(a)) * rr), round(y0 + math.sin(math.radians(a)) * rr * .8)
        if 0 <= x < art.width and 0 <= y < art.height and a % 9: px[x, y] = (255, 214, 160, 255)
    for _ in range(46):  # debris
        a, d = rnd.random() * 2 * math.pi, r * (1.1 + rnd.random() * 1.6)
        x, y = round(x0 + math.cos(a) * d), round(y0 + math.sin(a) * d)
        c = rnd.choice([(255, 181, 71), (220, 90, 40), (120, 100, 90), INK])
        for t in range(rnd.randint(1, 3)):
            qx, qy = round(x - math.cos(a) * t), round(y - math.sin(a) * t)
            if 0 <= qx < art.width and 0 <= qy < art.height: px[qx, qy] = c + (255,)
    glow.dot(p, (200, 80, 30), r * 1.7)
    glow.dot(p, (255, 200, 140), r * .6)


def missile(art, glow, p0, p1, seed):
    """A missile streaking in on a smoke trail."""
    px = art.load()
    rnd = random.Random(seed)
    n = int(max(abs(p1[0] - p0[0]), abs(p1[1] - p0[1])))
    for i in range(n):
        t = i / n
        x, y = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t + math.sin(t * 9 + seed) * 1.5 * (1 - t)
        if rnd.random() < .75:
            g = 60 + int(80 * t)
            qx, qy = round(x + rnd.uniform(-1, 1) * (1 - t) * 2), round(y + rnd.uniform(-1, 1) * (1 - t) * 2)
            if 0 <= qx < art.width and 0 <= qy < art.height: px[qx, qy] = (g, g - 6, g - 10, 255)
    hx, hy = round(p1[0]), round(p1[1])
    for dx, dy, c in [(0, 0, (230, 226, 216)), (-1, 0, (150, 150, 140)), (-2, 0, (200, 60, 40)), (-3, 0, (255, 181, 71)), (-4, 0, (255, 240, 200))]:
        ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
        qx, qy = round(hx + math.cos(ang) * -dx * -1), round(hy + math.sin(ang) * -dx * -1)
        qx, qy = round(hx + math.cos(ang) * dx), round(hy + math.sin(ang) * dx)
        if 0 <= qx < art.width and 0 <= qy < art.height: px[qx, qy] = c + (255,)
    glow.dot((p1[0] - math.cos(math.atan2(p1[1] - p0[1], p1[0] - p0[0])) * 4, p1[1] - math.sin(math.atan2(p1[1] - p0[1], p1[0] - p0[0])) * 4), (255, 150, 60), 4)


def variant_d():
    """The barrage: five machines from the arsenal firing on the healing front at once, a warhead going off, missiles inbound."""
    gw, gh, k = 315, 250, 4
    art = sky(gw, gh, (5, 6, 11), (14, 12, 18), glow=(300, 170, 180, (70, 36, 24), .55))
    layer, seam = planet(11, 252, 236, gw, gh, math.radians(18), front_seed=4, shift=58)
    art.alpha_composite(layer)
    glow = Glow(k)
    for (x, y) in seam[::9]:  # the healing front gives off light
        glow.dot((x, y), (200, 100, 40), 1.1)
    front = sorted(seam, key=lambda p: p[1])
    tgt = lambda f: front[int(len(front) * f)]
    # a warhead hits the dead side
    blast(art, glow, (150, 214), 12, 11)
    # missiles inbound from the lower left
    for i, (a, b) in enumerate([((-10, 236), (150, 214)), ((-10, 206), (130, 186)), ((20, 250), (162, 232))]):
        missile(art, glow, a, b, i)
    # machines (mirrored to face the planet) and what they fire
    bomber, ion = part('m-bomber-0'), part('m-ion-2')
    gat, lance, laser = part('m-gatling-2', True), part('m-lance-2', True), part('m-laser-2', True)
    shots = [
        (ion, (150, 100), (150, 100 + 15), (150, 158), (240, 250, 255), (98, 208, 238), 2),
        (gat, (66, 118), (66 + 28, 118 + 16), None, None, None, 0),
        (lance, (54, 168), (54 + 30, 168 + 17), tgt(.55), (255, 240, 255), (190, 120, 255), 2),
        (laser, (100, 224), (100 + 30, 224 + 16), tgt(.93), (255, 245, 230), (255, 82, 50), 2),
    ]
    for spr, pos, m, to, core, edge, w in shots:
        put(art, spr, *pos)
        if to: beam(art, glow, m, to, core, edge, w); impact(art, glow, to, edge, 2 + w, pos[0])
    # gatling: a hose of tracers walking across the front
    for i, f in enumerate([.16, .22, .28, .34]):
        t = tgt(f)
        line(art, 66 + 28, 118 + 16, t[0], t[1], (255, 196, 90), every=3, on=3)
        glow.line((66 + 28, 118 + 16), t, (255, 150, 50), 1.2)
        impact(art, glow, t, (255, 181, 71), 1, 30 + i)
    # bomber over the top of the planet, a stick of bombs falling
    put(art, bomber, 276, 26)
    for i in range(4):
        bx, by = 270 + i * 3, 42 + i * 8
        art.load()[bx, by] = (40, 42, 48, 255); art.load()[bx, by + 1] = (200, 64, 42, 255)
        glow.dot((bx, by + 2), (255, 120, 50), .9)
    impact(art, glow, (284, 80), (255, 181, 71), 2, 77)
    img = finish(art, k)
    img = glow.apply(img, blur=14, strength=.6)
    title(img, 72, 54, 168, 'BRING DEAD WORLDS BACK TO LIFE', 30, gap=14)
    return img


def word(art, text, x, y, size, top, bottom, outline=(8, 8, 12), align='left'):
    """A big word on the art grid: pixel letters with a vertical colour ramp and a thick dark outline (reads at thumbnail size)."""
    f = ImageFont.truetype(FONT, size)
    w = int(f.getlength(text)) + 8
    m = Image.new('L', (w, size + 8))
    ImageDraw.Draw(m).text((4, 0), text, font=f, fill=255)
    m = m.point(lambda v: 255 if v > 127 else 0)
    bold = m.copy(); bold.paste(255, None, m.transform(m.size, Image.AFFINE, (1, 0, -1, 0, 1, 0)))  # one pixel wider strokes
    m = bold
    mp = m.load()
    x0 = x - w if align == 'right' else x - w // 2 if align == 'center' else x
    px = art.load()
    # outline: every pixel within 2 of a letter
    for yy in range(m.height):
        for xx in range(w):
            if any(0 <= xx + dx < w and 0 <= yy + dy < m.height and mp[xx + dx, yy + dy] for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)):
                gx, gy = x0 + xx, y + yy
                if 0 <= gx < art.width and 0 <= gy < art.height: px[gx, gy] = outline + (255,)
    for yy in range(m.height):
        k = yy / max(1, size)
        col = mix(top, bottom, min(1, k + (BAYER[yy & 3][0] / 16 - .5) * .1))
        for xx in range(w):
            if mp[xx, yy]:
                gx, gy = x0 + xx, y + yy
                if 0 <= gx < art.width and 0 <= gy < art.height: px[gx, gy] = col + (255,)
    return x0, w


def thumb_split():
    """YouTube thumbnail: DEAD | ALIVE. One planet split down the middle, an orbital beam slamming the seam, the commander in front."""
    gw, gh, k, size = 320, 180, 4, (1280, 720)
    art = sky(gw, gh, (4, 5, 9), (12, 10, 16), glow=(250, 80, 150, (40, 60, 30), .45))
    layer, seam = planet(11, 198, 200, gw, gh, 0.0, front_seed=7, shift=0, light=(.9, -.4))
    art.alpha_composite(layer)
    glow = Glow(k, size)
    for (x, y) in seam[::5]:
        glow.dot((x, y), (230, 120, 40), 1.4)
    hit = (198, 68)
    # the orbital beam: a thick white-hot column with amber edges, slamming the seam
    beam(art, glow, (198, -4), hit, (255, 252, 240), (255, 170, 60), 4)
    glow.line((198, -4), hit, (255, 190, 90), 14)
    # impact: a pixel starburst, a shockwave ring hugging the planet, sparks
    px = art.load()
    for a in range(0, 360, 45):
        ln = 38 if a % 90 == 0 else 20
        for t in range(4, ln):
            x, y = round(hit[0] + math.cos(math.radians(a)) * t), round(hit[1] + math.sin(math.radians(a)) * t * .7)
            if 0 <= x < gw and 0 <= y < gh: px[x, y] = ((255, 250, 235) if t < ln * .6 else (255, 181, 71)) + (255,)
    for a in range(0, 360, 2):
        x, y = round(hit[0] + math.cos(math.radians(a)) * 46), round(hit[1] + 6 + math.sin(math.radians(a)) * 9)
        if 0 <= x < gw and 0 <= y < gh and a % 6: px[x, y] = (255, 214, 160, 255)
    impact(art, glow, hit, (255, 181, 71), 6, 3)
    sparks(art, hit[0], hit[1], 120, [(255, 250, 235), (255, 181, 71), (220, 90, 40)], 34, 5)
    glow.dot(hit, (255, 150, 50), 34)
    glow.dot(hit, (255, 235, 200), 12)
    # the words either side of the beam
    word(art, 'DEAD', 189, 2, 46, (222, 218, 210), (112, 108, 106), align='right')
    word(art, 'ALIVE', 207, 2, 46, (214, 255, 150), (50, 196, 78))
    # the commander in front, rim-lit
    vos = part('vos')
    art.alpha_composite(vos, (-8, 48))
    # the game's name, small, bottom right
    word(art, 'TERRAFORM', 316, 160, 16, (255, 196, 90), (230, 140, 40), align='right')
    img = finish(art, k, size)
    return glow.apply(img, blur=14, strength=.75)


def thumb_wide():
    """YouTube thumbnail: the barrage key art in 16:9 with the quiet title and 'Official trailer' (no shouting words)."""
    gw, gh, k, size = 320, 180, 4, (1280, 720)
    art = sky(gw, gh, (5, 6, 11), (14, 12, 18), glow=(300, 130, 170, (70, 36, 24), .55))
    layer, seam = planet(11, 250, 214, gw, gh, math.radians(18), front_seed=4, shift=58)
    art.alpha_composite(layer)
    glow = Glow(k, size)
    for (x, y) in seam[::9]:
        glow.dot((x, y), (200, 100, 40), 1.1)
    front = sorted([p for p in seam if p[1] < gh - 4], key=lambda p: p[1])
    tgt = lambda f: front[int(len(front) * f)]
    blast(art, glow, (172, 150), 11, 11)
    for i, (a, b) in enumerate([((-10, 178), (150, 160)), ((-10, 150), (126, 134))]):
        missile(art, glow, a, b, i)
    bomber, ion = part('m-bomber-0'), part('m-ion-2')
    gat, lance, laser = part('m-gatling-2', True), part('m-lance-2', True), part('m-laser-2', True)
    shots = [
        (ion, (214, 24), (214, 24 + 15), tgt(.08), (240, 250, 255), (98, 208, 238), 2),
        (lance, (54, 116), (54 + 30, 116 + 17), tgt(.45), (255, 240, 255), (190, 120, 255), 2),
        (laser, (112, 158), (112 + 30, 158 + 16), tgt(.8), (255, 245, 230), (255, 82, 50), 2),
    ]
    for spr, pos, m, to, core, edge, w in shots:
        put(art, spr, *pos)
        beam(art, glow, m, to, core, edge, w); impact(art, glow, to, edge, 2 + w, pos[0])
    put(art, gat, 92, 86)
    for i, f in enumerate([.2, .26, .32]):
        t = tgt(f)
        line(art, 92 + 28, 86 + 16, t[0], t[1], (255, 196, 90), every=3, on=3)
        glow.line((92 + 28, 86 + 16), t, (255, 150, 50), 1.2)
        impact(art, glow, t, (255, 181, 71), 1, 30 + i)
    put(art, bomber, 292, 20)
    img = finish(art, k, size)
    img = glow.apply(img, blur=14, strength=.6)
    title(img, 60, 44, 120, 'OFFICIAL TRAILER', 24, gap=12)
    return img


def thumb_painted(src=PARTS + 'thumb-art.png', cx=740, y=58, tsize=120):
    """YouTube thumbnail over painted key art: the title in white floating in the open sky, a small italic subtitle (Terra Nil style)."""
    img = Image.open(src).convert('RGB').resize((1280, 720), Image.LANCZOS)
    q = 4
    fs = ImageFont.truetype(FONT, tsize // q)
    sw = [fs.getlength(c) for c in 'TERRAFORM']
    small = Image.new('RGBA', (int(sum(sw) + len(sw) * 2 + 10), tsize // q + 8))
    sd = ImageDraw.Draw(small); sd.fontmode = '1'
    x = 2
    for c, w in zip('TERRAFORM', sw):
        for b in (0, 1): sd.text((x + b, 1), c, font=fs, fill=(255, 255, 255, 255))  # one extra column: heavier strokes
        x += w + 2
    big = small.resize((small.width * q, small.height * q), Image.NEAREST)
    x0 = int(cx - x * q / 2)
    shade = (16, 26, 86)  # the sky's own deep blue
    soft = Image.new('L', img.size)
    soft.paste(big.split()[3], (x0 + 4, y + 10))
    img = Image.composite(Image.new('RGB', img.size, shade), img, soft.filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * .7)))
    img.paste(Image.new('RGB', big.size, shade), (x0 + 6, y + 8), big)
    img.paste(big, (x0, y), big)
    d = ImageDraw.Draw(img)
    sub, t = ImageFont.truetype('/usr/share/fonts/truetype/lato/Lato-BoldItalic.ttf', 38), 'Official Trailer'
    tw = d.textlength(t, font=sub)
    ty = y + tsize + 2
    d.text((cx - tw / 2 + 3, ty + 3), t, font=sub, fill=shade)
    d.text((cx - tw / 2, ty), t, font=sub, fill=(255, 255, 255))
    return img


def grade_to_game(img):
    """Grade painted art into Terraform's world: a dusk sky (navy at the top with pixel stars, amber at the horizon, amber-lit
    clouds), olive-moss greens instead of candy green, navy shadows and amber highlights."""
    import numpy as np
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = .3 * r + .59 * g + .11 * b
    yy = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    sat = a.max(axis=2) - a.min(axis=2)
    cloud = (sat < .22) & (lum > .4) & (yy < .62)  # white-grey clouds, mid-tones included so they stay whole
    sky = (b > r + .12) & (b > g + .05) & (yy < .62) & ~cloud  # the blue sky
    # dusk sky: navy at the top, violet, then amber at the horizon
    t = np.clip(yy / .58, 0, 1)[..., None]
    top, midc, horz = np.array([.04, .05, .11]), np.array([.17, .14, .27]), np.array([.80, .44, .22])
    dusk = np.where(t < .6, top + (midc - top) * (t / .6), midc + (horz - midc) * ((t - .6) / .4))
    dusk = dusk * (.85 + .3 * lum[..., None])
    out = np.where(sky[..., None], dusk, a)
    # clouds: amber-lit tops, violet undersides
    cl = np.clip((lum - .4) / .6, 0, 1)[..., None]
    cloud_col = np.array([.36, .26, .40]) + (np.array([1.0, .74, .45]) - np.array([.36, .26, .40])) * cl ** 1.4
    out = np.where(cloud[..., None], cloud_col, out)
    # the land: less candy, greens toward olive, navy shadows, amber highlights
    land = ~(sky | cloud)
    L = (.3 * out[..., 0] + .59 * out[..., 1] + .11 * out[..., 2])[..., None]
    desat = L + (out - L) * .62
    greenish = ((out[..., 1] > out[..., 0] + .05) & (out[..., 1] > out[..., 2]))[..., None]
    desat = np.where(greenish, desat * np.array([1.02, .92, .7]), desat)
    tone = np.where(L < .5, desat + (np.array([.05, .06, .13]) - desat) * (1 - L / .5) * .35, desat + (np.array([1.0, .78, .5]) - desat) * ((L - .5) / .5) * .22)
    out = np.where(land[..., None], tone, out)
    # warm light from the horizon, a vignette
    vy, vx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((vx - w / 2) / (w * .62)) ** 2 + ((vy - h / 2) / (h * .62)) ** 2)
    out = out * (1 - np.clip((d - .55) / .6, 0, 1)[..., None] * .55)
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    # pixel stars coming out in the dark top of the sky, the size of the art's pixels
    px = img.load(); rnd = random.Random(3)
    for _ in range(140):
        x, y = rnd.randrange(w - 3), rnd.randrange(int(h * .3))
        if sky[y, x] and sky[y + 2, x + 2]:
            c = (239, 232, 218) if rnd.random() < .7 else (255, 214, 150)
            s_ = 3 if rnd.random() < .2 else 2
            for dx in range(s_):
                for dy in range(s_): px[x + dx, y + dy] = c
    return img


def thumb_game(src=PARTS + 'thumb-art.png'):
    """The painted key art graded into Terraform's dusk palette, with the game's title treatment (cream pixel title, amber rule)."""
    img = grade_to_game(Image.open(src).convert('RGB').resize((1280, 720), Image.LANCZOS))
    title(img, 742, 44, 120, 'BRING DEAD WORLDS BACK TO LIFE', 21, align='center', gap=12)
    return img


if __name__ == '__main__':
    v = sys.argv[1] if len(sys.argv) > 1 else 'A'
    img = {'A': variant_a, 'B': variant_b, 'C': variant_c, 'D': variant_d, 'T': thumb_split, 'W': thumb_wide, 'P': thumb_painted, 'G': thumb_game}[v]()
    img.save(sys.argv[2] if len(sys.argv) > 2 else f'{HERE}/../itch/cover-{v}.png')
