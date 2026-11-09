"""Extrae los nodos del mapa de la portada del kick-off y arma las aristas.
Uso: python3 -I scripts/extract-nodes.py docs/design/portada-kickoff.png src/data/network.json
"""
import sys, json, math
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
W, H = im.size
px = im.load()

def klass(r, g, b):
    if r > 190 and g > 170 and b < 140: return "y"       # amarillo
    if r > 190 and g > 190 and b > 190: return "w"       # blanco
    if b > 200 and r < 140 and g < 170: return "b"       # azul
    return None

mask = [[None]*W for _ in range(H)]
for y in range(H):
    row = mask[y]
    for x in range(W):
        row[x] = klass(*px[x, y])

seen = [[False]*W for _ in range(H)]
blobs = []
for y in range(H):
    for x in range(W):
        k = mask[y][x]
        if not k or seen[y][x]: continue
        stack = [(x, y)]; seen[y][x] = True
        pts = []
        while stack:
            cx, cy = stack.pop(); pts.append((cx, cy))
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = cx+dx, cy+dy
                if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx] and mask[ny][nx] == k:
                    seen[ny][nx] = True; stack.append((nx, ny))
        if len(pts) < 5: continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        bw, bh = max(xs)-min(xs)+1, max(ys)-min(ys)+1
        if max(bw, bh) > 2.2*min(bw, bh) or max(bw, bh) > 40: continue   # descarta trazos de línea
        blobs.append({"x": sum(xs)/len(xs), "y": sum(ys)/len(ys),
                      "r": math.sqrt(len(pts)/math.pi), "k": k})

# solo el mapa (derecha de la portada)
blobs = [b for b in blobs if b["x"] > W*0.58]
minx = min(b["x"] for b in blobs); maxx = max(b["x"] for b in blobs)
miny = min(b["y"] for b in blobs); maxy = max(b["y"] for b in blobs)
pad = 14
vw, vh = maxx-minx+2*pad, maxy-miny+2*pad
nodes = [{"x": round(b["x"]-minx+pad, 1), "y": round(b["y"]-miny+pad, 1),
          "r": round(max(b["r"], 1.6), 1), "k": b["k"]} for b in blobs]

# aristas: cada nodo con sus 3 vecinos más cercanos, con tope de longitud
edges = set()
for i, a in enumerate(nodes):
    d = sorted(((math.hypot(a["x"]-b["x"], a["y"]-b["y"]), j) for j, b in enumerate(nodes) if j != i))
    for dist, j in d[:4]:
        if dist < 170: edges.add((min(i, j), max(i, j)))
json.dump({"w": round(vw, 1), "h": round(vh, 1), "nodes": nodes, "edges": sorted(edges)},
          open(out, "w"), separators=(",", ":"))
print(len(nodes), "nodos", len(edges), "aristas", round(vw), "x", round(vh))
