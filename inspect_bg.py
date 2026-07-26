import struct

def inspect_image():
    filepath = '/Users/aquillesantony/.gemini/antigravity/scratch/wasd_game/assets/background.jpg'
    with open(filepath, 'rb') as f:
        data = f.read()
        print("File size:", len(data))

inspect_image()
