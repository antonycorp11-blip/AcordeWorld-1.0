import os
from PIL import Image

def process_image():
    im = Image.open('assets/aquiles_full_sheet.jpg').convert('RGBA')
    w, h = im.size

    def remove_bg(img, threshold=220):
        data = img.getdata()
        new_data = []
        for r, g, b, a in data:
            if r > threshold and g > threshold and b > threshold:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append((r, g, b, a))
        img.putdata(new_data)
        return img

    # 1. Extract Avatar and Portrait from Left side
    avatar = im.crop((15, 60, 410, 480))
    avatar.save('assets/aquiles_avatar.png')
    
    face = im.crop((120, 90, 310, 280))
    face.save('assets/aquiles_face.png')

    # 2. Extract Sprite Rows from Right side (x > 545 to avoid vertical border line!)
    cell_w, cell_h = 100, 100
    sheet = Image.new('RGBA', (cell_w * 4, cell_h * 4), (0, 0, 0, 0))

    # Exact y-ranges for rows:
    row_y = [
        (135, 212),  # row 0: walking down
        (218, 292),  # row 1: walking up
        (378, 455),  # row 2: walking right
        (468, 538),  # row 3: attacking combo (4 distinct sword frames)
    ]

    # Exact x-ranges for first 4 columns, starting strictly after x=548 to avoid vertical divider line at x=535-542!
    col_x = [
        (548, 612),
        (615, 680),
        (682, 750),
        (752, 820)
    ]

    for row_idx, (y1, y2) in enumerate(row_y):
        for col_idx, (x1, x2) in enumerate(col_x):
            frame = im.crop((x1, y1, x2, y2))
            frame = remove_bg(frame, 220)
            
            bbox = frame.getbbox()
            if bbox:
                cropped = frame.crop(bbox)
                sw, sh = cropped.size
                pos_x = col_idx * cell_w + (cell_w - sw) // 2
                pos_y = row_idx * cell_h + (cell_h - sh) - 8 # align toward bottom of cell
                sheet.paste(cropped, (pos_x, pos_y), cropped)
            else:
                sheet.paste(frame, (col_idx * cell_w + 15, row_idx * cell_h + 15), frame)

    sheet.save('assets/spritesheet_aquiles.png')
    print("CLEAN EXTRACTION COMPLETE: assets/spritesheet_aquiles.png without any vertical lines!")

if __name__ == '__main__':
    process_image()
