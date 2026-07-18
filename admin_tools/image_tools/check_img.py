import os
from PIL import Image

image_path = r"F:\htdocs\ProjectRosaura\public\assets\img\welcome-banner.png"
img = Image.open(image_path).convert('RGBA')

w, h = img.size
print(f"Size: {w}x{h}")
corners = [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]
for c in corners:
    print(f"Corner {c}: {img.getpixel(c)}")

# Check how many transparent pixels
trans = sum(1 for x in range(w) for y in range(h) if img.getpixel((x,y))[3] < 128)
print(f"Transparent pixels: {trans}")

# Check how many black pixels (r<30, g<30, b<30, a>200)
black = sum(1 for x in range(w) for y in range(h) if all(v < 30 for v in img.getpixel((x,y))[:3]) and img.getpixel((x,y))[3] > 200)
print(f"Black pixels: {black}")
