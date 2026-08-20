import database as db
from datetime import datetime, timedelta

def seed():
    print("Inicializando base de datos...")
    db.init_db()
    
    # Verificar si ya hay datos
    existing = db.get_all_registros()
    if len(existing) > 0:
        print(f"Ya existen {len(existing)} registros en la base de datos. No se duplicarán datos de prueba.")
        return
        
    print("Insertando datos iniciales de prueba para el Dashboard...")
    hoy = datetime.now()
    
    ejemplos = [
        (
            (hoy - timedelta(days=3)).strftime('%Y-%m-%d'),
            "Cliente Alfa - Oficina Central",
            2.5,
            "Reunión de Levantamiento y Coordinación",
            "Definición del alcance del nuevo proyecto y calendario de entregas."
        ),
        (
            (hoy - timedelta(days=2)).strftime('%Y-%m-%d'),
            "Cliente Alfa - Remoto",
            4.0,
            "Desarrollo y Programación",
            "Implementación de módulo de autenticación y conexión con base de datos."
        ),
        (
            (hoy - timedelta(days=2)).strftime('%Y-%m-%d'),
            "Planta Industrial Beta",
            3.5,
            "Visita a Terreno y Auditoría",
            "Inspección de equipos en planta y revisión del flujo operativo con supervisores."
        ),
        (
            (hoy - timedelta(days=1)).strftime('%Y-%m-%d'),
            "Planta Industrial Beta",
            1.5,
            "Soporte y Resolución de Incidentes",
            "Ajuste de configuración en servidor local y pruebas de latencia."
        ),
        (
            hoy.strftime('%Y-%m-%d'),
            "Proyecto Gamma - Online",
            2.0,
            "Capacitación de Usuarios",
            "Sesión formativa sobre el nuevo módulo en Microsoft Teams con 10 usuarios."
        ),
        (
            hoy.strftime('%Y-%m-%d'),
            "Cliente Alfa - Remoto",
            3.0,
            "Desarrollo y Programación",
            "Creación de reportes automáticos exportables en formato Excel y CSV."
        )
    ]
    
    for fecha, lugar, horas, actividad, comentario in ejemplos:
        db.add_registro(fecha, lugar, horas, actividad, comentario)
        
    print("¡Datos de prueba insertados con éxito!")

if __name__ == "__main__":
    seed()
