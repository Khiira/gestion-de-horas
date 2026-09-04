from PIL import Image, ImageDraw, ImageFilter
import math
import os

def draw_high_res_icon(size=1024):
    """
    Dibuja el icono maestro de Gestión de Horas Pro en ultra-alta resolución (1024x1024)
    con diseño moderno de cronómetro / reloj de productividad:
    - Squircle oscuro profundo con borde sutil
    - Corona / botón superior de cronómetro
    - Anillo de progreso dinámico (Cyan a Esmeralda)
    - Manecillas estilizadas en posición 10:10 (símbolo de alta relojería y éxito)
    - Acabado con detalles nítidos de alta precisión
    """
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Margen general
    pad = int(size * 0.04)
    w = size - pad * 2
    h = size - pad * 2
    x0, y0 = pad, pad
    x1, y1 = pad + w, pad + h
    
    # 2. Botón superior del cronómetro (Pulsador a las 12:00)
    btn_w = int(size * 0.18)
    btn_h = int(size * 0.07)
    btn_x0 = (size - btn_w) // 2
    btn_y0 = int(size * 0.02)
    btn_r = int(btn_h * 0.4)
    draw.rounded_rectangle(
        [btn_x0, btn_y0, btn_x0 + btn_w, btn_y0 + btn_h],
        radius=btn_r,
        fill=(51, 65, 85, 255),
        outline=(56, 189, 248, 200),
        width=max(2, int(size * 0.006))
    )
    
    # Pequeño cuello del botón
    neck_w = int(btn_w * 0.45)
    neck_h = int(size * 0.04)
    neck_x0 = (size - neck_w) // 2
    neck_y0 = btn_y0 + btn_h - 2
    draw.rectangle([neck_x0, neck_y0, neck_x0 + neck_w, neck_y0 + neck_h], fill=(71, 85, 105, 255))
    
    # 3. Fondo Squircle (Contenedor principal)
    sq_y0 = pad + int(size * 0.035)
    sq_y1 = y1
    radius = int(size * 0.22)
    
    # Dibujar degradado sutil en el fondo del squircle
    draw.rounded_rectangle(
        [x0, sq_y0, x1, sq_y1],
        radius=radius,
        fill=(11, 15, 25, 255),  # Fondo Obsidian muy elegante
        outline=(56, 189, 248, 140), # Borde cian sutil
        width=max(3, int(size * 0.009))
    )
    
    # Borde interior sutil
    in_pad = int(size * 0.018)
    draw.rounded_rectangle(
        [x0 + in_pad, sq_y0 + in_pad, x1 - in_pad, sq_y1 - in_pad],
        radius=radius - in_pad,
        outline=(255, 255, 255, 22),
        width=max(1, int(size * 0.003))
    )
    
    # 4. Esfera circular del cronómetro / reloj
    center_x = size // 2
    center_y = sq_y0 + (sq_y1 - sq_y0) // 2
    dial_r = int(size * 0.33)
    
    # Fondo del dial (un tono ligeramente más claro para profundidad)
    draw.ellipse(
        [center_x - dial_r, center_y - dial_r, center_x + dial_r, center_y + dial_r],
        fill=(15, 23, 42, 255),
        outline=(30, 41, 59, 255),
        width=max(2, int(size * 0.008))
    )
    
    # Pista de fondo del arco de progreso
    track_r = int(dial_r * 0.88)
    track_width = max(6, int(size * 0.04))
    draw.arc(
        [center_x - track_r, center_y - track_r, center_x + track_r, center_y + track_r],
        start=0,
        end=360,
        fill=(30, 41, 59, 180),
        width=track_width
    )
    
    # Arco de progreso vibrante (Desde las 12:00 / -90° hasta ~200° de recorrido)
    # Dibujamos segmentos para simular degradado Cyan (#38bdf8) -> Emerald (#10b981)
    start_deg = -90
    total_span = 290  # ~80% de jornada completada
    steps = 40
    for i in range(steps):
        s_angle = start_deg + (total_span / steps) * i
        e_angle = start_deg + (total_span / steps) * (i + 1) + 0.8
        t = i / steps
        # Interpolar entre Cyan (56, 189, 248) y Emerald (16, 185, 129)
        r_c = int(56 + (16 - 56) * t)
        g_c = int(189 + (185 - 189) * t)
        b_c = int(248 + (129 - 248) * t)
        draw.arc(
            [center_x - track_r, center_y - track_r, center_x + track_r, center_y + track_r],
            start=s_angle,
            end=e_angle,
            fill=(r_c, g_c, b_c, 255),
            width=track_width
        )
    
    # Puntos de las horas (12, 3, 6, 9)
    tick_r = int(dial_r * 0.68)
    for hour in [12, 3, 6, 9]:
        ang = math.radians((hour * 30) - 90)
        tx = center_x + int(tick_r * math.cos(ang))
        ty = center_y + int(tick_r * math.sin(ang))
        dot_s = max(3, int(size * 0.013))
        draw.ellipse([tx - dot_s, ty - dot_s, tx + dot_s, ty + dot_s], fill=(148, 163, 184, 200))
    
    # 5. Manecillas en posición 10:10
    # Manecilla corta de las horas (hacia las 10:00 -> -150 grados)
    h_angle = math.radians(-150)
    h_len = int(dial_r * 0.44)
    hx = center_x + int(h_len * math.cos(h_angle))
    hy = center_y + int(h_len * math.sin(h_angle))
    draw.line(
        [(center_x, center_y), (hx, hy)],
        fill=(248, 250, 252, 255),
        width=max(4, int(size * 0.026))
    )
    
    # Manecilla larga de los minutos (hacia las 2:00 -> -30 grados, color esmeralda)
    m_angle = math.radians(-30)
    m_len = int(dial_r * 0.68)
    mx = center_x + int(m_len * math.cos(m_angle))
    my = center_y + int(m_len * math.sin(m_angle))
    draw.line(
        [(center_x, center_y), (mx, my)],
        fill=(52, 211, 153, 255),  # Esmeralda vibrante
        width=max(3, int(size * 0.020))
    )
    
    # Segundero estilizado / aguja rápida (hacia las 6:25 -> 105 grados, color cian eléctrico)
    s_angle = math.radians(105)
    s_len = int(dial_r * 0.72)
    sx = center_x + int(s_len * math.cos(s_angle))
    sy = center_y + int(s_len * math.sin(s_angle))
    tail_x = center_x - int((s_len * 0.25) * math.cos(s_angle))
    tail_y = center_y - int((s_len * 0.25) * math.sin(s_angle))
    draw.line(
        [(tail_x, tail_y), (sx, sy)],
        fill=(56, 189, 248, 240),
        width=max(2, int(size * 0.009))
    )
    
    # 6. Eje / Núcleo central cromado
    hub_r = max(5, int(size * 0.038))
    draw.ellipse([center_x - hub_r, center_y - hub_r, center_x + hub_r, center_y + hub_r], fill=(15, 23, 42, 255), outline=(56, 189, 248, 255), width=max(1, int(size * 0.007)))
    hub_inner = max(2, int(hub_r * 0.45))
    draw.ellipse([center_x - hub_inner, center_y - hub_inner, center_x + hub_inner, center_y + hub_inner], fill=(248, 250, 252, 255))
    
    return img

def generate_all_icons():
    print("Generando icono maestro en ultra-resolucion (1024x1024 con supersampling)...")
    master = draw_high_res_icon(size=1024)
    
    # Lista de tamaños para icono.ico de Windows
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    ico_images = []
    
    for s in ico_sizes:
        # Redimensionar con Lanczos de alta fidelidad
        resized = master.resize(s, Image.Resampling.LANCZOS)
        ico_images.append(resized)
        
    # Guardar icono.ico principal en la raíz
    ico_images[0].save('icono.ico', format='ICO', sizes=ico_sizes, append_images=ico_images[1:])
    print("[OK] icono.ico generado en la raiz")
    
    # Crear carpeta static si no existe
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    os.makedirs(static_dir, exist_ok=True)
    
    # Guardar favicons en static
    ico_images[0].save(os.path.join(static_dir, 'favicon.ico'), format='ICO', sizes=ico_sizes, append_images=ico_images[1:])
    master.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(static_dir, 'favicon.png'), format='PNG')
    master.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(static_dir, 'favicon-32x32.png'), format='PNG')
    master.resize((16, 16), Image.Resampling.LANCZOS).save(os.path.join(static_dir, 'favicon-16x16.png'), format='PNG')
    print("[OK] Favicons generados en static/ (favicon.ico, favicon.png, 32x32, 16x16)")
    
    # Guardar iconos para las Extensiones de Chrome/Edge y Firefox
    ext_dirs = [
        os.path.join(os.path.dirname(__file__), 'Extension_Navegador'),
        os.path.join(os.path.dirname(__file__), 'Extension_Firefox')
    ]
    
    for ed in ext_dirs:
        if os.path.exists(ed):
            master.resize((16, 16), Image.Resampling.LANCZOS).save(os.path.join(ed, 'icon16.png'), format='PNG')
            master.resize((48, 48), Image.Resampling.LANCZOS).save(os.path.join(ed, 'icon48.png'), format='PNG')
            master.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(ed, 'icon128.png'), format='PNG')
            print(f"[OK] Iconos actualizados en {os.path.basename(ed)}/ (16px, 48px, 128px)")
            
    print("\n[LISTO] Todos los iconos y favicons fueron redisenados y generados exitosamente!")

if __name__ == '__main__':
    generate_all_icons()
