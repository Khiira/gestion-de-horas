// Service worker para la extensión Gestión de Horas Pro

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extensión Gestión de Horas Pro instalada.");
  // Crear alarma de chequeo cada 30 minutos para recordar cronómetros olvidados
  chrome.alarms.create("verificarCronometro", { periodInMinutes: 30 });
  // Alarma de chequeo rápido cada minuto para horarios exactos configurados
  chrome.alarms.create("verificarHorarioEspecial", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "verificarCronometro") {
    chrome.storage.local.get(["isRunning", "startTime", "actividad"], (res) => {
      if (res.isRunning && res.startTime) {
        const elapsedHours = (Date.now() - res.startTime) / (1000 * 60 * 60);
        if (elapsedHours >= 2.0) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon48.png",
            title: "⏳ Cronómetro Activo (> 2 horas)",
            message: `Llevas ${elapsedHours.toFixed(1)} hrs en: "${res.actividad || 'Tarea sin nombre'}". Recuerda detenerlo y guardarlo en tu Excel si ya terminaste.`,
            priority: 2
          });
        }
      }
    });
  } else if (alarm.name === "verificarHorarioEspecial") {
    fetch("http://127.0.0.1:5000/api/recordatorio")
      .then(r => r.json())
      .then(res => {
        if (res.status === "success" && res.data.config && res.data.config.alarma_carga_sistemas) {
          const cfg = res.data.config.alarma_carga_sistemas;
          if (cfg.activo === false) return;

          const now = new Date();
          const targetParts = (cfg.hora || "17:50").split(":");
          const targetHour = parseInt(targetParts[0], 10);
          const targetMin = parseInt(targetParts[1], 10);

          const diaCfg = parseInt(cfg.dia_semana, 10);
          // En JS: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
          // En nuestra config (Python weekday): 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo
          const jsToPyDay = (now.getDay() + 6) % 7;

          let coincideDia = false;
          if (diaCfg === -2) coincideDia = true;
          else if (diaCfg === -1) coincideDia = (jsToPyDay <= 4);
          else coincideDia = (jsToPyDay === diaCfg);

          if (coincideDia && now.getHours() === targetHour && now.getMinutes() === targetMin) {
            const todayStr = now.toISOString().split("T")[0];
            chrome.storage.local.get(["ultimoAvisoProgramado"], (stored) => {
              if (stored.ultimoAvisoProgramado !== todayStr) {
                chrome.storage.local.set({ ultimoAvisoProgramado: todayStr });
                chrome.notifications.create({
                  type: "basic",
                  iconUrl: "icon48.png",
                  title: "📅 Recordatorio: Bitácora y People Space",
                  message: "¡Hola! Es la hora programada. Recuerda cargar y revisar todas tus horas en la Bitácora y en el People Space.",
                  priority: 2
                });
              }
            });
          }
        }
      })
      .catch(err => {
        // App cerrada o no accesible
      });
  }
});
