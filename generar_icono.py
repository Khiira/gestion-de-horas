from PIL import Image, ImageDraw
import math

def create_icon():
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    images = []
    
    for size in sizes:
        w, h = size
        img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Fondo con esquinas redondeadas (Estilo moderno Slate & Emerald)
        radius = int(w * 0.22)
        
        bg_color = (15, 23, 42, 255)       # Slate 900 (Fondo elegante profundo)
        accent_color = (16, 185, 129, 255) # Emerald 500 (Verde vibrante pro)
        white_color = (248, 250, 252, 255) # White brillante
        
        draw.rounded_rectangle([(0, 0), (w-1, h-1)], radius=radius, fill=bg_color, outline=accent_color, width=max(1, int(w*0.05)))
        
        # Círculo del reloj
        center_x, center_y = w // 2, h // 2
        r_clock = int(w * 0.32)
        draw.ellipse([(center_x - r_clock, center_y - r_clock), (center_x + r_clock, center_y + r_clock)], outline=accent_color, width=max(2, int(w*0.06)))
        
        # Punto central
        r_dot = max(2, int(w * 0.05))
        draw.ellipse([(center_x - r_dot, center_y - r_dot), (center_x + r_dot, center_y + r_dot)], fill=white_color)
        
        # Manecilla corta (horas - hacia las 10)
        angle_h = math.radians(210)
        len_h = int(r_clock * 0.55)
        hx = center_x + int(len_h * math.cos(angle_h))
        hy = center_y + int(len_h * math.sin(angle_h))
        draw.line([(center_x, center_y), (hx, hy)], fill=white_color, width=max(2, int(w*0.06)))
        
        # Manecilla larga (minutos - hacia las 2, color esmeralda vibrante)
        angle_m = math.radians(330)
        len_m = int(r_clock * 0.8)
        mx = center_x + int(len_m * math.cos(angle_m))
        my = center_y + int(len_m * math.sin(angle_m))
        draw.line([(center_x, center_y), (mx, my)], fill=accent_color, width=max(2, int(w*0.05)))
        
        images.append(img)
        
    images[0].save('icono.ico', format='ICO', sizes=sizes, append_images=images[1:])
    print("¡Icono generado con éxito: icono.ico!")

if __name__ == '__main__':
    create_icon()
