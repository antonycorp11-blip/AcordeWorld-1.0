#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw

WORLD_WIDTH = 2048
WORLD_HEIGHT = 1142
assets_dir = '/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets'
os.makedirs(assets_dir, exist_ok=True)

# 1. Road Mask (Green)
road_img = Image.new('RGBA', (WORLD_WIDTH, WORLD_HEIGHT), (0, 0, 0, 0))
draw = ImageDraw.Draw(road_img)

# Central Fountain Plaza
draw.ellipse([(1024 - 310, 610 - 310), (1024 + 310, 610 + 310)], fill=(34, 197, 94, 255))
# Fountain Hole
draw.ellipse([(1024 - 100, 610 - 100), (1024 + 100, 610 + 100)], fill=(0, 0, 0, 0))

# North Castle Road
draw.rectangle([(890, 0), (1150, 480)], fill=(34, 197, 94, 255))
# South Music Garden Road
draw.rectangle([(890, 740), (1150, 1142)], fill=(34, 197, 94, 255))
# West Road to Village & River
draw.rectangle([(0, 520), (900, 700)], fill=(34, 197, 94, 255))
# East Road to Musical Forest
draw.rectangle([(1150, 520), (2048, 700)], fill=(34, 197, 94, 255))
# Winding Forest Curve
draw.line([(1500, 610), (1800, 400), (2048, 450)], fill=(34, 197, 94, 255), width=160)

road_img.save(os.path.join(assets_dir, 'acordelot_road_mask.png'))

# 2. Wind Zone Mask (Yellow)
wind_img = Image.new('RGBA', (WORLD_WIDTH, WORLD_HEIGHT), (0, 0, 0, 0))
draw_w = ImageDraw.Draw(wind_img)
# Forest Trees
draw_w.ellipse([(1400, 100), (2048, 800)], fill=(253, 224, 71, 255))
# North Castle Canopy
draw_w.ellipse([(600, 0), (1440, 300)], fill=(253, 224, 71, 255))
# West River Trees
draw_w.ellipse([(0, 600), (600, 1142)], fill=(253, 224, 71, 255))

wind_img.save(os.path.join(assets_dir, 'acordelot_wind_mask.png'))

# 3. Water Zone Mask (Blue)
water_img = Image.new('RGBA', (WORLD_WIDTH, WORLD_HEIGHT), (0, 0, 0, 0))
draw_wa = ImageDraw.Draw(water_img)
# Center Fountain
draw_wa.ellipse([(1024 - 95, 610 - 95), (1024 + 95, 610 + 95)], fill=(59, 130, 246, 255))
# East River
draw_wa.rectangle([(1420, 580), (1650, 1142)], fill=(59, 130, 246, 255))
# West River
draw_wa.line([(150, 0), (100, 500), (300, 800), (600, 1142)], fill=(59, 130, 246, 255), width=180)

water_img.save(os.path.join(assets_dir, 'acordelot_water_mask.png'))

# 4. Foreground Roof Overlay Mask
acordelot_path = os.path.join(assets_dir, 'acordelot.jpg')
if os.path.exists(acordelot_path):
    map_raw = Image.open(acordelot_path).convert('RGBA').resize((WORLD_WIDTH, WORLD_HEIGHT), Image.Resampling.NEAREST)
    fg_img = Image.new('RGBA', (WORLD_WIDTH, WORLD_HEIGHT), (0, 0, 0, 0))
    fg_draw = ImageDraw.Draw(fg_img)

    # Castle Battlements & Towers (North)
    fg_draw.rectangle([(750, 0), (1300, 240)], fill=(255, 255, 255, 255))
    # House Roof Eaves (West)
    fg_draw.ellipse([(600, 480), (840, 600)], fill=(255, 255, 255, 255))
    # House Roof Eaves (East)
    fg_draw.ellipse([(1200, 480), (1450, 600)], fill=(255, 255, 255, 255))
    # Treble Clef Tree Crown (East Forest)
    fg_draw.ellipse([(1500, 200), (1950, 650)], fill=(255, 255, 255, 255))

    # Mask map image using fg_img
    final_fg = Image.composite(map_raw, Image.new('RGBA', (WORLD_WIDTH, WORLD_HEIGHT), (0, 0, 0, 0)), fg_img.split()[3])
    final_fg.save(os.path.join(assets_dir, 'acordelot_fg_mask.png'))

print("INITIALIZED ACORDELOT PNG MASKS SUCCESSFULLY!")
