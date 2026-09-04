import sqlite3
import os
import sys
from datetime import datetime, timedelta

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "horas.db")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            lugar TEXT NOT NULL,
            horas REAL NOT NULL,
            actividad TEXT NOT NULL,
            comentario TEXT,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feriados_cache (
            fecha TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            tipo TEXT,
            irrenunciable INTEGER DEFAULT 0,
            anio INTEGER NOT NULL,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agenda_tareas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            minutos_recordatorio INTEGER DEFAULT 10,
            estado TEXT DEFAULT 'pendiente',
            lugar TEXT,
            horas_estimadas REAL DEFAULT 1.0,
            notificado INTEGER DEFAULT 0,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            tema_principal TEXT DEFAULT 'General',
            subtema TEXT DEFAULT '',
            contenido TEXT,
            fecha TEXT NOT NULL,
            color TEXT DEFAULT '#3b82f6',
            fijada INTEGER DEFAULT 0,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def add_registro(fecha, lugar, horas, actividad, comentario):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO registros (fecha, lugar, horas, actividad, comentario)
        VALUES (?, ?, ?, ?, ?)
    ''', (fecha, lugar, float(horas), actividad, comentario))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_registro(new_id)

def get_registro(registro_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM registros WHERE id = ?', (registro_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_registros(fecha_inicio=None, fecha_fin=None, lugar=None, actividad=None, search=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM registros WHERE 1=1'
    params = []
    
    if fecha_inicio:
        query += ' AND fecha >= ?'
        params.append(fecha_inicio)
    if fecha_fin:
        query += ' AND fecha <= ?'
        params.append(fecha_fin)
    if lugar and lugar != 'Todos':
        query += ' AND lugar = ?'
        params.append(lugar)
    if actividad and actividad != 'Todas':
        query += ' AND actividad = ?'
        params.append(actividad)
    if search:
        query += ' AND (lugar LIKE ? OR actividad LIKE ? OR comentario LIKE ?)'
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])
        
    query += ' ORDER BY fecha DESC, id DESC'
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_registro(registro_id, fecha, lugar, horas, actividad, comentario):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE registros
        SET fecha = ?, lugar = ?, horas = ?, actividad = ?, comentario = ?
        WHERE id = ?
    ''', (fecha, lugar, float(horas), actividad, comentario, registro_id))
    conn.commit()
    conn.close()
    return get_registro(registro_id)

def delete_registro(registro_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM registros WHERE id = ?', (registro_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_dashboard_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Total horas (General, hoy, semana actual, mes actual)
    today_str = datetime.now().strftime('%Y-%m-%d')
    
    # Calcular lunes de esta semana
    today_dt = datetime.now()
    monday_dt = today_dt - timedelta(days=today_dt.weekday())
    monday_str = monday_dt.strftime('%Y-%m-%d')
    
    # Primer día del mes
    first_day_month_str = today_dt.strftime('%Y-%m-01')
    
    # Total General
    cursor.execute('SELECT COALESCE(SUM(horas), 0) as total FROM registros')
    total_general = cursor.fetchone()['total']
    cursor.execute("SELECT COALESCE(SUM(horas), 0) as total FROM registros WHERE LOWER(lugar) LIKE '%interno%'")
    total_general_interno = cursor.fetchone()['total']
    
    # Total Hoy
    cursor.execute('SELECT COALESCE(SUM(horas), 0) as total FROM registros WHERE fecha = ?', (today_str,))
    total_hoy = cursor.fetchone()['total']
    cursor.execute("SELECT COALESCE(SUM(horas), 0) as total FROM registros WHERE fecha = ? AND LOWER(lugar) LIKE '%interno%'", (today_str,))
    total_hoy_interno = cursor.fetchone()['total']
    
    # Total Semana
    cursor.execute('SELECT COALESCE(SUM(horas), 0) as total FROM registros WHERE fecha >= ?', (monday_str,))
    total_semana = cursor.fetchone()['total']
    cursor.execute("SELECT COALESCE(SUM(horas), 0) as total FROM registros WHERE fecha >= ? AND LOWER(lugar) LIKE '%interno%'", (monday_str,))
    total_semana_interno = cursor.fetchone()['total']
    
    # Total Mes
    cursor.execute('SELECT COALESCE(SUM(horas), 0) as total FROM registros WHERE fecha >= ?', (first_day_month_str,))
    total_mes = cursor.fetchone()['total']
    cursor.execute("SELECT COALESCE(SUM(horas), 0) as total FROM registros WHERE fecha >= ? AND LOWER(lugar) LIKE '%interno%'", (first_day_month_str,))
    total_mes_interno = cursor.fetchone()['total']
    
    # 2. Distribución por Lugar / Cliente
    cursor.execute('''
        SELECT lugar, COALESCE(SUM(horas), 0) as total_horas, COUNT(*) as cantidad
        FROM registros
        GROUP BY lugar
        ORDER BY total_horas DESC
    ''')
    por_lugar = [dict(row) for row in cursor.fetchall()]
    
    # 3. Distribución por Actividad
    cursor.execute('''
        SELECT actividad, COALESCE(SUM(horas), 0) as total_horas, COUNT(*) as cantidad
        FROM registros
        GROUP BY actividad
        ORDER BY total_horas DESC
    ''')
    por_actividad = [dict(row) for row in cursor.fetchall()]
    
    # 4. Tendencia últimos 30 días
    thirty_days_ago_str = (today_dt - timedelta(days=30)).strftime('%Y-%m-%d')
    cursor.execute('''
        SELECT fecha, COALESCE(SUM(horas), 0) as total_horas
        FROM registros
        WHERE fecha >= ?
        GROUP BY fecha
        ORDER BY fecha ASC
    ''', (thirty_days_ago_str,))
    por_fecha = [dict(row) for row in cursor.fetchall()]
    
    # 5. Lugares únicos y Actividades únicas (para filtros)
    cursor.execute('SELECT DISTINCT lugar FROM registros ORDER BY lugar ASC')
    lugares_unicos = [row['lugar'] for row in cursor.fetchall()]
    
    cursor.execute('SELECT DISTINCT actividad FROM registros ORDER BY actividad ASC')
    actividades_unicas = [row['actividad'] for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "totales": {
            "general": round(total_general, 2),
            "general_interno": round(total_general_interno, 2),
            "hoy": round(total_hoy, 2),
            "hoy_interno": round(total_hoy_interno, 2),
            "semana": round(total_semana, 2),
            "semana_interno": round(total_semana_interno, 2),
            "mes": round(total_mes, 2),
            "mes_interno": round(total_mes_interno, 2)
        },
        "por_lugar": por_lugar,
        "por_actividad": por_actividad,
        "por_fecha": por_fecha,
        "filtros": {
            "lugares": lugares_unicos,
            "actividades": actividades_unicas
        }
    }

def get_sugerencias():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Lugares ordenados por frecuencia y fecha más reciente
    cursor.execute('''
        SELECT lugar, COUNT(*) as cnt, MAX(fecha) as last_d 
        FROM registros 
        WHERE lugar IS NOT NULL AND lugar != ''
        GROUP BY lugar 
        ORDER BY cnt DESC, last_d DESC 
        LIMIT 30
    ''')
    lugares = [row['lugar'] for row in cursor.fetchall()]
    
    # 2. Actividades ordenadas por frecuencia y fecha más reciente
    cursor.execute('''
        SELECT actividad, COUNT(*) as cnt, MAX(fecha) as last_d 
        FROM registros 
        WHERE actividad IS NOT NULL AND actividad != ''
        GROUP BY actividad 
        ORDER BY cnt DESC, last_d DESC 
        LIMIT 30
    ''')
    actividades = [row['actividad'] for row in cursor.fetchall()]
    
    # 3. Comentarios recientes y frecuentes
    cursor.execute('''
        SELECT comentario, MAX(fecha) as last_d 
        FROM registros 
        WHERE comentario IS NOT NULL AND comentario != '' 
        GROUP BY comentario 
        ORDER BY last_d DESC 
        LIMIT 30
    ''')
    comentarios = [row['comentario'] for row in cursor.fetchall()]
    
    # 4. Registros recientes únicos (combinaciones anteriormente puestas)
    cursor.execute('''
        SELECT lugar, actividad, comentario, horas, MAX(fecha) as last_d 
        FROM registros 
        WHERE lugar != '' AND actividad != ''
        GROUP BY lugar, actividad, comentario 
        ORDER BY last_d DESC, id DESC 
        LIMIT 15
    ''')
    recientes = []
    for row in cursor.fetchall():
        recientes.append({
            "lugar": row['lugar'],
            "actividad": row['actividad'],
            "comentario": row['comentario'] or "",
            "horas": float(row['horas']),
            "last_d": row['last_d']
        })
        
    conn.close()
    return {
        "lugares": lugares,
        "actividades": actividades,
        "comentarios": comentarios,
        "recientes": recientes
    }

# Fallback robusto de Feriados en Chile por si se está sin conexión a Internet o la API externa falla
FERIADOS_CHILE_FALLBACK = [
    # 2025
    {"fecha": "2025-01-01", "titulo": "Año Nuevo", "tipo": "Civil", "irrenunciable": 1, "anio": 2025},
    {"fecha": "2025-04-18", "titulo": "Viernes Santo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-04-19", "titulo": "Sábado Santo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-05-01", "titulo": "Día Nacional del Trabajo", "tipo": "Civil", "irrenunciable": 1, "anio": 2025},
    {"fecha": "2025-05-21", "titulo": "Día de las Glorias Navales", "tipo": "Civil", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-06-20", "titulo": "Día Nacional de los Pueblos Indígenas", "tipo": "Civil", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-06-29", "titulo": "San Pedro y San Pablo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-07-16", "titulo": "Día de la Virgen del Carmen", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-08-15", "titulo": "Asunción de la Virgen", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-09-18", "titulo": "Independencia Nacional", "tipo": "Civil", "irrenunciable": 1, "anio": 2025},
    {"fecha": "2025-09-19", "titulo": "Día de las Glorias del Ejército", "tipo": "Civil", "irrenunciable": 1, "anio": 2025},
    {"fecha": "2025-10-12", "titulo": "Encuentro de Dos Mundos", "tipo": "Civil", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-10-31", "titulo": "Día de las Iglesias Evangélicas y Protestantes", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-11-01", "titulo": "Día de Todos los Santos", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-12-08", "titulo": "Inmaculada Concepción", "tipo": "Religioso", "irrenunciable": 0, "anio": 2025},
    {"fecha": "2025-12-25", "titulo": "Navidad", "tipo": "Religioso", "irrenunciable": 1, "anio": 2025},
    # 2026
    {"fecha": "2026-01-01", "titulo": "Año Nuevo", "tipo": "Civil", "irrenunciable": 1, "anio": 2026},
    {"fecha": "2026-04-03", "titulo": "Viernes Santo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-04-04", "titulo": "Sábado Santo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-05-01", "titulo": "Día Nacional del Trabajo", "tipo": "Civil", "irrenunciable": 1, "anio": 2026},
    {"fecha": "2026-05-21", "titulo": "Día de las Glorias Navales", "tipo": "Civil", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-06-21", "titulo": "Día Nacional de los Pueblos Indígenas", "tipo": "Civil", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-06-29", "titulo": "San Pedro y San Pablo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-07-16", "titulo": "Día de la Virgen del Carmen", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-08-15", "titulo": "Asunción de la Virgen", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-09-18", "titulo": "Independencia Nacional", "tipo": "Civil", "irrenunciable": 1, "anio": 2026},
    {"fecha": "2026-09-19", "titulo": "Día de las Glorias del Ejército", "tipo": "Civil", "irrenunciable": 1, "anio": 2026},
    {"fecha": "2026-10-12", "titulo": "Encuentro de Dos Mundos", "tipo": "Civil", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-10-31", "titulo": "Día de las Iglesias Evangélicas y Protestantes", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-11-01", "titulo": "Día de Todos los Santos", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-12-08", "titulo": "Inmaculada Concepción", "tipo": "Religioso", "irrenunciable": 0, "anio": 2026},
    {"fecha": "2026-12-25", "titulo": "Navidad", "tipo": "Religioso", "irrenunciable": 1, "anio": 2026},
    # 2027
    {"fecha": "2027-01-01", "titulo": "Año Nuevo", "tipo": "Civil", "irrenunciable": 1, "anio": 2027},
    {"fecha": "2027-03-26", "titulo": "Viernes Santo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-03-27", "titulo": "Sábado Santo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-05-01", "titulo": "Día Nacional del Trabajo", "tipo": "Civil", "irrenunciable": 1, "anio": 2027},
    {"fecha": "2027-05-21", "titulo": "Día de las Glorias Navales", "tipo": "Civil", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-06-21", "titulo": "Día Nacional de los Pueblos Indígenas", "tipo": "Civil", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-06-28", "titulo": "San Pedro y San Pablo", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-07-16", "titulo": "Día de la Virgen del Carmen", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-08-15", "titulo": "Asunción de la Virgen", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-09-18", "titulo": "Independencia Nacional", "tipo": "Civil", "irrenunciable": 1, "anio": 2027},
    {"fecha": "2027-09-19", "titulo": "Día de las Glorias del Ejército", "tipo": "Civil", "irrenunciable": 1, "anio": 2027},
    {"fecha": "2027-10-11", "titulo": "Encuentro de Dos Mundos", "tipo": "Civil", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-10-31", "titulo": "Día de las Iglesias Evangélicas y Protestantes", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-11-01", "titulo": "Día de Todos los Santos", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-12-08", "titulo": "Inmaculada Concepción", "tipo": "Religioso", "irrenunciable": 0, "anio": 2027},
    {"fecha": "2027-12-25", "titulo": "Navidad", "tipo": "Religioso", "irrenunciable": 1, "anio": 2027}
]

def get_feriados_chile(anio=None):
    import json
    import urllib.request
    
    if not anio:
        anio = datetime.now().year
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Asegurar que estén los datos de fallback en caché por si acaso no hay internet o es primera vez
    try:
        cursor.execute("SELECT COUNT(*) as cnt FROM feriados_cache WHERE anio = ?", (anio,))
        row_cnt = cursor.fetchone()['cnt']
        if row_cnt == 0:
            for f in FERIADOS_CHILE_FALLBACK:
                if f['anio'] == anio or f['anio'] in (anio-1, anio+1):
                    cursor.execute('''
                        INSERT OR IGNORE INTO feriados_cache (fecha, titulo, tipo, irrenunciable, anio)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (f['fecha'], f['titulo'], f['tipo'], f['irrenunciable'], f['anio']))
            conn.commit()
    except Exception as e:
        pass

    # 2. Intentar consultar API externa (siempre que se consulte el año actual y si no se ha consultado en 24h)
    should_fetch = False
    try:
        cursor.execute("SELECT MAX(actualizado_en) as last_up FROM feriados_cache WHERE anio = ?", (anio,))
        row = cursor.fetchone()
        last_up = row['last_up'] if row else None
        if not last_up:
            should_fetch = True
        else:
            try:
                dt_last = datetime.strptime(last_up[:19], '%Y-%m-%d %H:%M:%S')
                if (datetime.now() - dt_last).total_seconds() > 86400:
                    should_fetch = True
            except:
                should_fetch = True
    except:
        should_fetch = True

    if should_fetch and anio == datetime.now().year:
        try:
            req = urllib.request.Request(
                "https://api.victorsanmartin.com/feriados/en.json",
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GestionHorasPro/1.0'}
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    data_json = json.loads(response.read().decode('utf-8'))
                    if data_json.get("status") == "success" and data_json.get("data"):
                        for item in data_json["data"]:
                            fecha_str = item.get("date")
                            if fecha_str:
                                item_anio = int(fecha_str.split("-")[0])
                                titulo = item.get("title", "Feriado")
                                tipo = item.get("type", "Civil")
                                irr = 1 if item.get("inalienable") in (True, 1, "true", "True") else 0
                                cursor.execute('''
                                    INSERT OR REPLACE INTO feriados_cache (fecha, titulo, tipo, irrenunciable, anio, actualizado_en)
                                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                                ''', (fecha_str, titulo, tipo, irr, item_anio))
                        conn.commit()
        except Exception as api_err:
            pass

    # 3. Retornar feriados de los años cercanos para cubrir navegación del calendario
    cursor.execute('''
        SELECT fecha, titulo, tipo, irrenunciable, anio
        FROM feriados_cache
        WHERE anio IN (?, ?, ?)
        ORDER BY fecha ASC
    ''', (anio - 1, anio, anio + 1))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [{
        "fecha": row["fecha"],
        "titulo": row["titulo"],
        "tipo": row["tipo"],
        "irrenunciable": bool(row["irrenunciable"]),
        "anio": row["anio"]
    } for row in rows]

# ==========================================
# GESTIÓN DE AGENDA Y PLANNER DE TAREAS
# ==========================================

def add_agenda_tarea(titulo, descripcion, fecha, hora, minutos_recordatorio=10, lugar='', horas_estimadas=1.0, estado='pendiente'):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO agenda_tareas (titulo, descripcion, fecha, hora, minutos_recordatorio, lugar, horas_estimadas, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (titulo, descripcion, fecha, hora, int(minutos_recordatorio), lugar, float(horas_estimadas), estado))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_agenda_tarea(new_id)

def get_agenda_tarea(tarea_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM agenda_tareas WHERE id = ?', (tarea_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_agenda_tareas(fecha=None, estado=None, solo_proximas=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = 'SELECT * FROM agenda_tareas WHERE 1=1'
    params = []
    
    if fecha:
        query += ' AND fecha = ?'
        params.append(fecha)
    if estado and estado != 'todos':
        query += ' AND estado = ?'
        params.append(estado)
    if solo_proximas:
        hoy_str = datetime.now().strftime('%Y-%m-%d')
        query += ' AND (fecha >= ? OR fecha = "") AND estado != "completada"'
        params.append(hoy_str)
        
    query += ' ORDER BY fecha ASC, hora ASC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_agenda_tarea(tarea_id, titulo, descripcion, fecha, hora, minutos_recordatorio, lugar, horas_estimadas, estado):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Si se cambia fecha o hora, resetear notificado a 0
    cursor.execute('''
        UPDATE agenda_tareas
        SET titulo = ?, descripcion = ?, fecha = ?, hora = ?, minutos_recordatorio = ?, lugar = ?, horas_estimadas = ?, estado = ?, notificado = 0
        WHERE id = ?
    ''', (titulo, descripcion, fecha, hora, int(minutos_recordatorio), lugar, float(horas_estimadas), estado, tarea_id))
    conn.commit()
    conn.close()
    return get_agenda_tarea(tarea_id)

def update_estado_agenda_tarea(tarea_id, nuevo_estado):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE agenda_tareas SET estado = ? WHERE id = ?', (nuevo_estado, tarea_id))
    conn.commit()
    conn.close()
    return get_agenda_tarea(tarea_id)

def delete_agenda_tarea(tarea_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM agenda_tareas WHERE id = ?', (tarea_id,))
    conn.commit()
    conn.close()
    return True

def get_tareas_pendientes_recordatorio():
    """Retorna tareas donde falte el tiempo configurado para el aviso y no hayan sido notificadas."""
    conn = get_db_connection()
    cursor = conn.cursor()
    ahora = datetime.now()
    hoy_str = ahora.strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT * FROM agenda_tareas 
        WHERE fecha = ? AND estado != 'completada' AND notificado = 0
    ''', (hoy_str,))
    rows = cursor.fetchall()
    conn.close()
    
    tareas_a_notificar = []
    for row in rows:
        t_dict = dict(row)
        try:
            if not t_dict.get('fecha') or not t_dict.get('hora'):
                continue
            # Parsear fecha y hora de la tarea
            fecha_hora_str = f"{t_dict['fecha']} {t_dict['hora']}"
            dt_tarea = datetime.strptime(fecha_hora_str, '%Y-%m-%d %H:%M')
            minutos_antes = t_dict.get('minutos_recordatorio', 10)
            
            # Calcular tiempo de disparo (momento en que debe notificar)
            dt_disparo = dt_tarea - timedelta(minutes=minutos_antes)
            
            # Si ya llegó el momento de notificar y no pasaron más de 30 minutos del horario programado
            if ahora >= dt_disparo and ahora <= (dt_tarea + timedelta(minutes=30)):
                tareas_a_notificar.append(t_dict)
        except Exception as e:
            print(f"[Agenda BD Error] {e}")
            
    return tareas_a_notificar

def marcar_agenda_tarea_notificada(tarea_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE agenda_tareas SET notificado = 1 WHERE id = ?', (tarea_id,))
    conn.commit()
    conn.close()

# ==========================================
# GESTIÓN DE NOTAS Y APUNTES
# ==========================================

def add_nota(titulo, tema_principal='General', subtema='', contenido='', fecha=None, color='#3b82f6', fijada=0):
    if not fecha:
        fecha = datetime.now().strftime('%Y-%m-%d')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO notas (titulo, tema_principal, subtema, contenido, fecha, color, fijada)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (titulo.strip(), (tema_principal or 'General').strip(), (subtema or '').strip(), (contenido or '').strip(), fecha, color or '#3b82f6', 1 if fijada else 0))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_nota(new_id)

def get_nota(nota_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notas WHERE id = ?', (nota_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_notas(search=None, tema=None, subtema=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = 'SELECT * FROM notas WHERE 1=1'
    params = []

    if tema and tema != 'Todos':
        query += ' AND tema_principal = ?'
        params.append(tema)

    if subtema and subtema != 'Todos':
        query += ' AND subtema = ?'
        params.append(subtema)

    if search:
        query += ' AND (titulo LIKE ? OR tema_principal LIKE ? OR subtema LIKE ? OR contenido LIKE ?)'
        s_param = f"%{search}%"
        params.extend([s_param, s_param, s_param, s_param])

    query += ' ORDER BY fijada DESC, fecha DESC, id DESC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_nota(nota_id, titulo, tema_principal='General', subtema='', contenido='', fecha=None, color='#3b82f6', fijada=0):
    if not fecha:
        fecha = datetime.now().strftime('%Y-%m-%d')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE notas
        SET titulo = ?, tema_principal = ?, subtema = ?, contenido = ?, fecha = ?, color = ?, fijada = ?, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (titulo.strip(), (tema_principal or 'General').strip(), (subtema or '').strip(), (contenido or '').strip(), fecha, color or '#3b82f6', 1 if fijada else 0, nota_id))
    conn.commit()
    conn.close()
    return get_nota(nota_id)

def delete_nota(nota_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM notas WHERE id = ?', (nota_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def toggle_fijar_nota(nota_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT fijada FROM notas WHERE id = ?', (nota_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    nuevo_estado = 0 if row['fijada'] else 1
    cursor.execute('UPDATE notas SET fijada = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?', (nuevo_estado, nota_id))
    conn.commit()
    conn.close()
    return get_nota(nota_id)

def get_temas_notas():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT DISTINCT tema_principal, subtema 
        FROM notas 
        WHERE tema_principal IS NOT NULL AND tema_principal != '' 
        ORDER BY tema_principal ASC, subtema ASC
    ''')
    rows = cursor.fetchall()
    conn.close()

    temas = []
    subtemas_por_tema = {}
    todos_subtemas = set()

    for r in rows:
        t = (r['tema_principal'] or '').strip()
        s = (r['subtema'] or '').strip()
        if t:
            if t not in subtemas_por_tema:
                subtemas_por_tema[t] = []
                temas.append(t)
            if s and s not in subtemas_por_tema[t]:
                subtemas_por_tema[t].append(s)
            if s:
                todos_subtemas.add(s)

    return {
        "temas": temas,
        "subtemas_por_tema": subtemas_por_tema,
        "todos_subtemas": sorted(list(todos_subtemas))
    }



