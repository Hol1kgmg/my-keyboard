"""13x4 オーソリニア・キーボード (THTロープロファイルキーキャップ) の .glb を生成する。
モデリング座標: x=右, y=奥, z=上 [mm]  →  書き出し時に glTF 標準 (Y-up, メートル) に変換。
"""
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals
from PIL import Image, ImageDraw, ImageFont

# ───────── パラメータ (ここを変えれば形が変わる) ─────────
U = 19.05                 # キーピッチ
COLS, ROWS = 13, 4
CAP = 18.1                # キーキャップ底面 (THT: 18.1 x 18.1)
CAP_BODY_H = 3.8          # キャップ本体の高さ (全高5.5 = 本体 + 下に出るステム受け1.7)
CAP_STEM_DROP = 1.7
CAP_SKIRT = 0.9           # 垂直な裾の高さ
CAP_INSET_X, CAP_INSET_Y = 2.15, 1.7   # 天面の片側オフセット (図面から読み取り)
CAP_DISH = 0.5            # 天面の円筒状くぼみ深さ
RAIL_W, RAIL_H = 7.0, 3.0                    # 左右の真鍮レール (幅, プレートからの高さ)
FRAME_W = RAIL_W / 2                         # 外周の白い枠の幅 (レールの半分)。高さはレール上面と同じ
GAP_X, GAP_Y = 0.8, 0.5                      # キー群とレール/枠のすき間
CASE_H = 10.0                                # 底面からプレート上面まで (推定)
CASE_W = COLS * U + 2 * (GAP_X + RAIL_W + FRAME_W)
CASE_D = ROWS * U + 2 * (GAP_Y + FRAME_W)
RAIL_D = CASE_D - 2 * FRAME_W
CASE_R = 3.0
SW_TOP = 2.8              # プレート上面からスイッチ上面まで (ロープロファイルスイッチ)
CAP_Z0 = CASE_H + 3.5     # キャップ裾の下端の高さ (枠の上面より 0.5mm 上)

COL_CAP = (236, 235, 238)
COL_CAP_DARK = (32, 32, 35)
COL_LEGEND = (70, 70, 76)

F_IT = "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf"
F_BI = "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf"
F_SYM = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


# ───────── 汎用ジオメトリ ─────────
def rrect(w, h, r, n=6):
    """角丸長方形の輪郭 (上から見て反時計回り)。点数は常に 4*(n+1)。"""
    r = min(r, w / 2 - 1e-3, h / 2 - 1e-3)
    pts = []
    for cx, cy, a0 in ((w/2-r, h/2-r, 0), (-w/2+r, h/2-r, 90), (-w/2+r, -h/2+r, 180), (w/2-r, -h/2+r, 270)):
        for k in range(n + 1):
            a = np.radians(a0 + 90 * k / n)
            pts.append((cx + r * np.cos(a), cy + r * np.sin(a)))
    return np.array(pts)


def ring3(xy, z):
    z = np.broadcast_to(np.asarray(z, float), (len(xy),))
    return np.column_stack([xy, z])


class Builder:
    """帯(バンド)を積んでメッシュを作る。同じ smoothing group 内だけ頂点を共有 → 角はシャープに。"""
    def __init__(self):
        self.v, self.uv, self.f, self.key = [], [], [], {}

    def _vid(self, p, uv, g):
        k = (round(p[0], 4), round(p[1], 4), round(p[2], 4), g, round(uv[0], 5), round(uv[1], 5))
        if k not in self.key:
            self.key[k] = len(self.v)
            self.v.append(p); self.uv.append(uv)
        return self.key[k]

    def band(self, a, b, g, uva=None, uvb=None, flip=False):
        m = len(a)
        uva = np.zeros((m, 2)) if uva is None else uva
        uvb = np.zeros((m, 2)) if uvb is None else uvb
        for i in range(m):
            j = (i + 1) % m
            q = [self._vid(a[i], uva[i], g), self._vid(a[j], uva[j], g),
                 self._vid(b[j], uvb[j], g), self._vid(b[i], uvb[i], g)]
            for t in ((q[0], q[1], q[2]), (q[0], q[2], q[3])):
                if len(set(t)) == 3:
                    self.f.append(t[::-1] if flip else t)

    def mesh(self):
        m = trimesh.Trimesh(np.array(self.v), np.array(self.f), process=False)
        m.remove_unreferenced_vertices()
        return m, np.array(self.uv)


def prism(xy, z0, z1, b=None, g0=0):
    """輪郭 xy を z0→z1 に押し出した立体 (上下フタ付き)。"""
    b = b or Builder()
    c = xy.mean(0)
    lo, hi = ring3(xy, z0), ring3(xy, z1)
    cl, ch = ring3(np.tile(c, (len(xy), 1)), z0), ring3(np.tile(c, (len(xy), 1)), z1)
    b.band(lo, cl, g0, flip=True)
    b.band(lo, hi, g0 + 1)
    b.band(hi, ch, g0 + 2)
    return b


def solid(b, color, metallic=0.0, rough=0.6, name="mat"):
    m, _ = b.mesh()
    m.visual = TextureVisuals(material=PBRMaterial(
        name=name, baseColorFactor=[*color, 255], metallicFactor=metallic, roughnessFactor=rough))
    return m


# ───────── レイアウト ─────────
def L(text, kind, sym=None, dark=False):
    return dict(text=text, kind=kind, sym=sym, dark=dark)

A = lambda t: L(t, "alpha")
rows = [
    [L("Esc", "word")] + [A(c) for c in "QWERT"] + [L("pgup", "mod", "\u21de")] + [A(c) for c in "YUIOP"] + [L("del", "mod", "\u2326")],
    [L("control", "mod", "\u2303")] + [A(c) for c in "ASDFG"] + [L("pause", "mod", "PAUSE")] + [A(c) for c in "HJKL"] + [L("\u2014", "dash"), L("end", "mod", "\u2198")],
    [L("shift", "mod", "\u2191")] + [A(c) for c in "ZXCVB"] + [L("pgdn", "mod", "\u21df")] + [A(c) for c in "NM"] + [L("<", "pair", ","), L(">", "pair", "."), L("\u2191", "arrow"), L("fn", "word")],
]
keys = []   # (中心x[u], 行, 幅[u], legend)
for r, row in enumerate(rows):
    for c, lg in enumerate(row):
        keys.append((c + 0.5, r, 1.0, lg))
bottom = [L("lock", "mod", "LOCK"), L("cmd", "mod", "\u2318"), L("alt", "mod", "\u2325"), L("W", "logo")]
for c, lg in enumerate(bottom):
    keys.append((c + 0.5, 3, 1.0, lg))
for k in range(4):                                   # 1.25u x 4 (無刻印)
    keys.append((4 + 0.625 + 1.25 * k, 3, 1.25, L("", "blank")))
keys.append((9.5, 3, 1.0, L("W", "logo", dark=True)))
for c, s in zip((10, 11, 12), "\u2190\u2193\u2192"):
    keys.append((c + 0.5, 3, 1.0, L(s, "arrow")))


def key_xy(cx_u, r):
    return (cx_u - COLS / 2) * U, (ROWS / 2 - 0.5 - r) * U


# ───────── 刻印テクスチャ (アトラス) ─────────
PX = 256 / CAP                      # px / mm
CELL_W, CELL_H = int(round((CAP + 0.25 * U) * PX)) + 8, 256 + 8
ACOLS = 8
AROWS = -(-len(keys) // ACOLS)
atlas = Image.new("RGB", (ACOLS * CELL_W, AROWS * CELL_H), COL_CAP)


def draw_legend(d, x0, y0, wpx, lg):
    """(x0,y0) = キャップ footprint の左上 px。wpx = footprint 幅 px。"""
    fg = (245, 245, 245) if lg["dark"] else COL_LEGEND
    tx, ty = x0 + (CAP_INSET_X + 1.3) * PX, y0 + (CAP_INSET_Y + 1.2) * PX      # 天面の左上
    cx, cy = x0 + wpx / 2, y0 + 128
    bot = y0 + 256 - (CAP_INSET_Y + 1.5) * PX
    f = lambda p, s: ImageFont.truetype(p, s)
    k, t, s = lg["kind"], lg["text"], lg["sym"]
    if k == "alpha":
        d.text((tx, ty), t, font=f(F_IT, 66), fill=fg, anchor="lt")
    elif k == "word":
        d.text((tx, ty), t, font=f(F_IT, 46), fill=fg, anchor="lt")
    elif k == "dash":
        d.line((tx, cy, tx + 50, cy), fill=fg, width=5)
    elif k == "arrow":
        d.text((cx, cy), t, font=f(F_SYM, 84), fill=fg, anchor="mm")
    elif k == "logo":
        d.text((tx - 4, bot + 4), t, font=f(F_BI, 82), fill=fg, anchor="ls")
    elif k == "pair":
        d.text((tx, ty), t, font=f(F_IT, 66), fill=fg, anchor="lt")
        d.text((tx + 4, bot), s, font=f(F_IT, 66), fill=fg, anchor="ls")
    elif k == "mod":
        d.text((tx, ty), t, font=f(F_IT, 40), fill=fg, anchor="lt")
        sx, sy = cx + 6, bot - 22
        if s == "PAUSE":
            for dx in (-9, 9):
                d.line((sx + dx + 4, sy - 20, sx + dx - 4, sy + 20), fill=fg, width=6)
        elif s == "LOCK":
            d.arc((sx - 13, sy - 28, sx + 13, sy + 6), 180, 360, fill=fg, width=5)
            d.rounded_rectangle((sx - 20, sy - 10, sx + 20, sy + 22), 4, outline=fg, width=5)
        else:
            d.text((sx, sy), s, font=f(F_SYM, 66), fill=fg, anchor="mm")


# ───────── キーキャップ ─────────
caps = Builder()
drawer = ImageDraw.Draw(atlas)
AW, AH = atlas.size
for idx, (cx_u, r, w_u, lg) in enumerate(keys):
    W = CAP + (w_u - 1) * U
    kx, ky = key_xy(cx_u, r)
    # アトラス上のセル
    ax, ay = (idx % ACOLS) * CELL_W, (idx // ACOLS) * CELL_H
    wpx = W * PX
    fx0, fy0 = ax + (CELL_W - wpx) / 2, ay + 4
    if lg["dark"]:
        drawer.rectangle((ax, ay, ax + CELL_W - 1, ay + CELL_H - 1), fill=COL_CAP_DARK)
    draw_legend(drawer, fx0, fy0, wpx, lg)

    def uv(p, W=W, fx0=fx0, fy0=fy0):          # 真上からの平面投影 (側面は余白=無地を拾う)
        px = fx0 + (p[:, 0] + W / 2) * PX
        py = fy0 + (CAP / 2 - p[:, 1]) * PX
        return np.column_stack([px / AW, 1 - py / AH])

    Wt, Dt = W - 2 * CAP_INSET_X, CAP - 2 * CAP_INSET_Y
    ztop = lambda xy: CAP_BODY_H - CAP_DISH + CAP_DISH * (2 * xy[:, 0] / Wt) ** 2
    A_ = rrect(W, CAP, 1.2)
    C_ = rrect(Wt + 0.7, Dt + 0.7, 2.3)
    D_ = rrect(Wt, Dt, 2.0)
    rings = [
        (A_ * 0.0, 0.0, 0),                     # 底面中心
        (A_, 0.0, 0),
        (A_, 0.0, 1), (A_, CAP_SKIRT, 1),       # 裾
        (A_, CAP_SKIRT, 2), (C_, ztop(C_) - 0.3, 2),    # 斜面
        (C_, ztop(C_) - 0.3, 3), (D_, ztop(D_), 3),     # 面取り〜天面
    ] + [(D_ * s, ztop(D_ * s), 3) for s in (0.8, 0.6, 0.4, 0.2, 0.0)]
    off = np.array([kx, ky, CAP_Z0])
    for (xa, za, ga), (xb, zb, gb) in zip(rings[:-1], rings[1:]):
        if ga != gb:
            continue
        a, b_ = ring3(xa, za), ring3(xb, zb)
        ua, ub = uv(a), uv(b_)
        if ga == 0:                              # 底面は無地の画素を参照
            solid_uv = np.tile([(ax + 3) / AW, 1 - (ay + 3) / AH], (len(a), 1))
            caps.band(b_ + off, a + off, ga, solid_uv, solid_uv, flip=True)
        else:
            caps.band(a + off, b_ + off, ga, ua, ub)

cap_mesh, cap_uv = caps.mesh()
cap_mesh.visual = TextureVisuals(uv=cap_uv, material=PBRMaterial(
    name="keycap", baseColorTexture=atlas, metallicFactor=0.0, roughnessFactor=0.55))

# ───────── スイッチ (簡略形状) ─────────
sw = Builder()
stem = Builder()
for i, (cx_u, r, w_u, lg) in enumerate(keys):
    kx, ky = key_xy(cx_u, r)
    sq = lambda s, rr=0.8: rrect(s, s, rr, 2) + (kx, ky)
    g = i * 10
    c = np.tile([kx, ky], (12, 1))
    z = CASE_H
    sw.band(ring3(sq(15.6), z), ring3(sq(15.6), z + 1.0), g)
    sw.band(ring3(sq(15.6), z + 1.0), ring3(sq(14.0), z + 1.0), g + 1)
    sw.band(ring3(sq(14.0), z + 1.0), ring3(sq(11.0), z + SW_TOP), g + 2)
    sw.band(ring3(sq(11.0), z + SW_TOP), ring3(c, z + SW_TOP), g + 3)
    prism(sq(5.6, 0.5), z + SW_TOP, CAP_Z0 + 0.5, stem, g)
sw_mesh = solid(sw, (225, 225, 228), rough=0.5, name="switch_housing")
stem_mesh = solid(stem, (200, 200, 204), rough=0.5, name="switch_stem")

# ───────── ケース / レール / ネジ ─────────
cb = Builder()                                   # トレイ形状: 底 + 外壁 + 枠の上面 + 内壁 + プレート面
zt = CASE_H + RAIL_H
outer = rrect(CASE_W, CASE_D, CASE_R, 8)
inner = rrect(CASE_W - 2 * FRAME_W, CASE_D - 2 * FRAME_W, 0.6, 8)
cen = outer * 0.0
cb.band(ring3(outer, 0), ring3(cen, 0), 0, flip=True)
cb.band(ring3(outer, 0), ring3(outer, zt), 1)
cb.band(ring3(outer, zt), ring3(inner, zt), 2)
cb.band(ring3(inner, zt), ring3(inner, CASE_H), 3)
cb.band(ring3(inner, CASE_H), ring3(cen, CASE_H), 4)
case_mesh = solid(cb, (238, 238, 240), rough=0.45, name="case")
rails, screws = Builder(), Builder()
rail_x = COLS * U / 2 + GAP_X + RAIL_W / 2
for s in (-1, 1):
    prism(rrect(RAIL_W, RAIL_D, 0.6, 4) + (s * rail_x, 0), CASE_H, CASE_H + RAIL_H, rails, g0=10 * (s + 2))
    for t in (-1, 1):
        circ = rrect(4.2, 4.2, 2.1, 6) + (s * rail_x, t * (RAIL_D / 2 - 4.5))
        prism(circ, CASE_H + RAIL_H, CASE_H + RAIL_H + 0.8, screws, g0=10 * (2 * s + t + 5))
rail_mesh = solid(rails, (181, 142, 78), metallic=1.0, rough=0.35, name="brass")
screw_mesh = solid(screws, (150, 150, 155), metallic=1.0, rough=0.3, name="steel")

# ───────── 書き出し ─────────
scene = trimesh.Scene()
for name, m in [("case", case_mesh), ("brass_rails", rail_mesh), ("screws", screw_mesh),
                ("switches", sw_mesh), ("stems", stem_mesh), ("keycaps", cap_mesh)]:
    scene.add_geometry(m, node_name=name, geom_name=name)
# mm, Z-up → m, Y-up
T = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], float) * 0.001
T[3, 3] = 1
scene.apply_transform(T)
import sys
out = sys.argv[1] if len(sys.argv) > 1 else "keyboard.glb"
with open(out, "wb") as fh:
    fh.write(scene.export(file_type="glb", include_normals=True))
atlas.save("atlas_debug.png")
print("keys:", len(keys), "| tris:", sum(len(g.faces) for g in scene.geometry.values()), "| bounds[m]:", scene.bounds.round(4).tolist())
