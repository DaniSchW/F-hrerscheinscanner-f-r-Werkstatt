import struct
import zlib
import os

def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

def make_png(size, path, rgb=(29, 111, 224)):
    width = height = size
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0
        for x in range(width):
            raw.extend(bytes(rgb))
    compressed = zlib.compress(bytes(raw), 9)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)

out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(out_dir, exist_ok=True)
make_png(192, os.path.join(out_dir, "icon-192.png"))
make_png(512, os.path.join(out_dir, "icon-512.png"))
print("done")
