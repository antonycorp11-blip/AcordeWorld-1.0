import os
from PIL import Image, ImageDraw, ImageFilter

bg1_path = '/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets/background.jpg'
bg2_path = '/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets/background2.jpg'
out_path = '/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets/world_2048.jpg'

img1 = Image.open(bg1_path).convert('RGB')
img2 = Image.open(bg2_path).convert('RGB')

w, h = img1.size # 1024, 571

# Create 2048x571 combined image
world = Image.new('RGB', (w * 2, h))

# Paste img1 on left (0 -> 1024)
world.paste(img1, (0, 0))

# Paste img2 on right (1024 -> 2048)
world.paste(img2, (w, 0))

# Create a smooth stone path & tree blend transition at seam x=1024
# At x=950..1100, y=260..370, draw connecting stone road from bridge (y=270..365) to forest path (y=310..400)
draw = ImageDraw.Draw(world)

# Sample stone brick color from bridge
stone_color = (195, 182, 155)
stone_border = (120, 110, 90)

# Draw connecting stone path from x=960 to x=1120
for x in range(960, 1120):
    # Interpolate y range from (270..365) to (310..400)
    t = (x - 960) / 160.0
    y1 = int(270 * (1 - t) + 310 * t)
    y2 = int(365 * (1 - t) + 400 * t)
    
    # Fill stone road
    draw.line([(x, y1), (x, y2)], fill=stone_color, width=1)
    draw.point((x, y1), fill=stone_border)
    draw.point((x, y2), fill=stone_border)

# Save high quality combined world
world.save(out_path, quality=95)
print("CREATED WORLD_2048.JPG SUCCESSFULLY!")
