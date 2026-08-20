import os
import json
import time
import threading
import webbrowser
from datetime import datetime
import uuid

try:
    from croniter import croniter
    CRONITER_AVAILABLE = True
except ImportError:
    CRONITER_AVAILABLE = False

try:
    from plyer import notification
    PLYER_AVAILABLE = True
except ImportError:
    PLYER_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config_alarmas.json")

DEFAULT_ALARMAS = [
    {
        "id": "recordatorio_periodico",
        "tipo": "periodica",
        "nombre": "Alerta Periódica de Actividad",
        "mensaje": "¡Hola! Han pasado los minutos configurados. Recuerda registrar tus actividades y horas trabajadas.",
        "activo": True,
        "intervalo_minutos": 60,
        "cron": "* * * * *"
    },
    {
        "id": "alarma_carga_sistemas",
        "tipo": "programada",
        "nombre": "Alerta de Bitácora & People Space",
        "mensaje": "¡Hola! Es hora del aviso programado. Recuerda cargar y revisar todas tus horas de trabajo en la Bitácora y en el People Space antes de finalizar.",
        "activo": True,
        "intervalo_minutos": 0,
        "cron": "0 17 * * 5"
    }
]

class RecordatorioHoras:
    def __init__(self):
        self.config = self.cargar_config()
        self.activo = False
        self.hilo = None
        self.ultimos_avisos_diarios = {}  # Para programadas: id -> "YYYY-MM-DD"
        self.tiempo_periodico = {}        # Para periodicas: id -> segundos_transcurridos

    def _migrar_config_vieja(self, data):
        """Convierte config de diccionario viejo a lista nueva si es necesario"""
        if isinstance(data, dict) and "alarmas" not in data:
            nuevo = {"alarmas": []}
            # Migrar periódica
            per = data.get("recordatorio_periodico", {})
            alm1 = dict(DEFAULT_ALARMAS[0])
            alm1["activo"] = per.get("activo", True)
            alm1["intervalo_minutos"] = per.get("intervalo_minutos", 60)
            nuevo["alarmas"].append(alm1)
            # Migrar programada
            prog = data.get("alarma_carga_sistemas", {})
            alm2 = dict(DEFAULT_ALARMAS[1])
            alm2["activo"] = prog.get("activo", True)
            
            # Legacy fallback: convert dia/hora to CRON if needed
            dia = prog.get("dia_semana", 4)
            hora_str = prog.get("hora", "17:50")
            try:
                hh, mm = hora_str.split(":")
            except Exception:
                hh, mm = "17", "00"
            
            if dia == -2:
                cron_dia = "*"
            elif dia == -1:
                cron_dia = "1-5"
            else:
                # cron: 0=Sun or 7=Sun in some systems, standard 1-5=Mon-Fri, but let's map python weekday to cron:
                # python: 0=Mon..6=Sun
                # croniter standard: 1=Mon..0=Sun
                # Wait, standard cron is 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
                # python weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
                cron_map = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0}
                cron_dia = str(cron_map.get(dia, "*"))
            
            alm2["cron"] = f"{int(mm)} {int(hh)} * * {cron_dia}"
            nuevo["alarmas"].append(alm2)
            return nuevo
        return data

    def cargar_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                    data = self._migrar_config_vieja(data)
                    
                    if "alarmas" not in data or not data["alarmas"]:
                        data["alarmas"] = DEFAULT_ALARMAS
                    return data
            except Exception as e:
                print(f"[Recordatorio] Error al leer {CONFIG_FILE}: {e}")
        return {"alarmas": list(DEFAULT_ALARMAS)}

    def guardar_config(self, nueva_config):
        try:
            # Asegurar IDs para nuevas alarmas
            if "alarmas" in nueva_config:
                for a in nueva_config["alarmas"]:
                    if not a.get("id"):
                        a["id"] = "alm_" + str(uuid.uuid4())[:8]

            self.config = nueva_config
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            print(f"[Recordatorio] Configuración guardada en {CONFIG_FILE}.")
            return True
        except Exception as e:
            print(f"[Recordatorio] Error al guardar config: {e}")
            return False

    def get_config(self):
        return self.config

    def _emitir_notificacion_nativa(self, titulo, mensaje, alarma_id=None):
        msg_consola = mensaje.encode('ascii', 'ignore').decode('ascii')
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Enviando notificación [{titulo}]: {msg_consola}")
        
        try:
            import winsound
            import os
            import ctypes
            
            wav_path_id = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{alarma_id}.wav") if alarma_id else None
            mp3_path_id = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{alarma_id}.mp3") if alarma_id else None
            
            wav_path_alerta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'alerta.wav')
            mp3_path_alerta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'alerta.mp3')
            
            # Prioridad 1: ID Especifico (MP3 luego WAV)
            if mp3_path_id and os.path.exists(mp3_path_id):
                ctypes.windll.winmm.mciSendStringW(f'close mi_audio', None, 0, None)
                ctypes.windll.winmm.mciSendStringW(f'open "{mp3_path_id}" type mpegvideo alias mi_audio', None, 0, None)
                ctypes.windll.winmm.mciSendStringW(f'play mi_audio', None, 0, None)
            elif wav_path_id and os.path.exists(wav_path_id):
                winsound.PlaySound(wav_path_id, winsound.SND_FILENAME | winsound.SND_ASYNC)
            # Prioridad 2: Alarma general (MP3 luego WAV)
            elif os.path.exists(mp3_path_alerta):
                ctypes.windll.winmm.mciSendStringW(f'close mi_audio', None, 0, None)
                ctypes.windll.winmm.mciSendStringW(f'open "{mp3_path_alerta}" type mpegvideo alias mi_audio', None, 0, None)
                ctypes.windll.winmm.mciSendStringW(f'play mi_audio', None, 0, None)
            elif os.path.exists(wav_path_alerta):
                winsound.PlaySound(wav_path_alerta, winsound.SND_FILENAME | winsound.SND_ASYNC)
            # Prioridad 3: Defecto Windows
            else:
                winsound.PlaySound("SystemAsterisk", winsound.SND_ALIAS | winsound.SND_ASYNC)
        except Exception as e:
            print("Error reproduciendo audio:", e)
            
        if PLYER_AVAILABLE:
            try:
                notification.notify(
                    title=titulo,
                    message=mensaje,
                    app_name='Gestión de Horas Pro',
                    timeout=12
                )
                return True
            except Exception as e:
                print(f"Error con plyer: {e}. Intentando fallback...")
        
        # Fallback nativo para Windows
        try:
            import ctypes
            def popup():
                ctypes.windll.user32.MessageBoxW(0, mensaje, titulo, 0x40 | 0x0)
            threading.Thread(target=popup, daemon=True).start()
            return True
        except Exception as e:
            print(f"Error en notificación fallback: {e}")
            return False

    def probar_alarma(self, alarma_id):
        alarmas = self.config.get("alarmas", [])
        for a in alarmas:
            if a.get("id") == alarma_id:
                return self._emitir_notificacion_nativa("PRUEBA: " + a.get("nombre", "Alarma"), a.get("mensaje", "Este es un mensaje de prueba."), alarma_id)
        
        # Retrocompatibilidad manual por si prueban ids fijos desde frontend viejo
        if alarma_id == "recordatorio_periodico":
            return self._emitir_notificacion_nativa("PRUEBA: Periódica", "Mensaje de prueba periódica.", alarma_id)
        if alarma_id == "alarma_carga_sistemas":
            return self._emitir_notificacion_nativa("PRUEBA: Programada", "Mensaje de prueba programada.", alarma_id)
        return False

    def _chequear_alarma_programada(self, alarma, now):
        if not CRONITER_AVAILABLE:
            return

        a_id = alarma.get("id")
        cron_expr = alarma.get("cron", "0 17 * * 5")
        
        try:
            # Check if current minute exactly matches the cron expression
            if croniter.match(cron_expr, now):
                fecha_hoy_str = now.strftime("%Y-%m-%d %H:%M") # Track by minute to avoid multi-triggers in the same minute
                if self.ultimos_avisos_diarios.get(a_id) != fecha_hoy_str:
                    self.ultimos_avisos_diarios[a_id] = fecha_hoy_str
                    titulo = f"📅 {alarma.get('nombre', 'Recordatorio')}"
                    self._emitir_notificacion_nativa(titulo, alarma.get("mensaje", "¡Es la hora programada!"), a_id)
        except Exception as e:
            print(f"Error parsing cron {cron_expr}: {e}")

    def _chequear_alarma_periodica(self, alarma):
        a_id = alarma.get("id")
        if a_id not in self.tiempo_periodico:
            self.tiempo_periodico[a_id] = 0

        self.tiempo_periodico[a_id] += 1
        
        intervalo_mins = max(1, int(alarma.get("intervalo_minutos", 60)))
        intervalo_segs = intervalo_mins * 60

        if self.tiempo_periodico[a_id] >= intervalo_segs:
            self.tiempo_periodico[a_id] = 0
            titulo = f"⏰ {alarma.get('nombre', 'Recordatorio')}"
            self._emitir_notificacion_nativa(titulo, alarma.get("mensaje", "Aviso periódico alcanzado."), a_id)

    def _chequear_y_avisar_agenda(self, now):
        try:
            import database as db
            tareas = db.get_tareas_pendientes_recordatorio()
            for t in tareas:
                min_antes = t.get('minutos_recordatorio', 10)
                tiempo_str = f"en {min_antes} min" if min_antes > 0 else "¡MOMENTO DE INICIAR!"
                lugar_str = f" ({t['lugar']})" if t.get('lugar') else ""
                titulo = f"📌 Agenda: {t['titulo']}"
                mensaje = f"Recordatorio ({tiempo_str})\nHora: {t['hora']}{lugar_str}"
                if t.get('descripcion'):
                    mensaje += f"\nNotas: {t['descripcion']}"
                
                self._emitir_notificacion_nativa(titulo, mensaje, "agenda")
                db.marcar_agenda_tarea_notificada(t['id'])
        except Exception as e:
            print(f"[Recordatorio Agenda Error] {e}")

    def _bucle_recordatorio(self):
        tick_agenda = 0
        while self.activo:
            time.sleep(1)
            now = datetime.now()
            
            alarmas = self.config.get("alarmas", [])
            for alm in alarmas:
                if not alm.get("activo", True):
                    continue
                    
                tipo = alm.get("tipo", "periodica")
                if tipo == "programada":
                    self._chequear_alarma_programada(alm, now)
                elif tipo == "periodica":
                    self._chequear_alarma_periodica(alm)

            tick_agenda += 1
            if tick_agenda >= 15:
                tick_agenda = 0
                self._chequear_y_avisar_agenda(now)

    def iniciar(self, intervalo_minutos=None):
        if not self.activo:
            self.activo = True
            self.hilo = threading.Thread(target=self._bucle_recordatorio, daemon=True)
            self.hilo.start()
            print("[Recordatorio] Automático dinámico iniciado.")

    def detener(self):
        self.activo = False
        print("[Recordatorio] Automático detenido.")

    def estado(self):
        return {
            "activo": self.activo,
            "config": self.config
        }

# Instancia global
gestor_recordatorio = RecordatorioHoras()
