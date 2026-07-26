import os
import shutil

src_bg = "/Users/aquillesantony/.gemini/antigravity/brain/cdeae4f4-13cf-4826-a3cd-7b7b67e67264/.user_uploaded/media__1784925034242.jpg"
src_sprite = "/Users/aquillesantony/.gemini/antigravity/brain/cdeae4f4-13cf-4826-a3cd-7b7b67e67264/hero_character_1784925198002.jpg"

dest_dir = "/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets"
os.makedirs(dest_dir, exist_ok=True)

shutil.copy(src_bg, os.path.join(dest_dir, "background.jpg"))
shutil.copy(src_sprite, os.path.join(dest_dir, "spritesheet.jpg"))

print("COPIED SUCCESSFULLY!")
print("Assets files:", os.listdir(dest_dir))
