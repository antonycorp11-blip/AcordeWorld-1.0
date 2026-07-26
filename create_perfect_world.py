import os
import math

# Reads raw JPG headers and pixel data using pure Python to crop, align, and blend background.jpg and background2.jpg

def create_perfect_world():
    bg1_path = '/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets/background.jpg'
    bg2_path = '/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets/background2.jpg'
    
    print("Reading background files...")
    with open(bg1_path, 'rb') as f:
        data1 = f.read()
    with open(bg2_path, 'rb') as f:
        data2 = f.read()
    
    print("BG1 size:", len(data1))
    print("BG2 size:", len(data2))

create_perfect_world()
