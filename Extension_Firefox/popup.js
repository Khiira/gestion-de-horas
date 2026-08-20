const API_URL = "http://127.0.0.1:5000/api";
let timerInterval = null;
let extFeriadosMap = {};

async function loadFeriadosExt() {
  try {
    const res = await fetch(`${API_URL}/feriados`);
    if (!res.ok) return;
    const result = await res.json();
    if (result.status === "success" && result.data) {
      result.data.forEach(f => {
        extFeriadosMap[f.fecha] = f;
      });
    }
    checkHolidayNoticeExt("c_fecha", "c_holiday_notice");
    checkHolidayNoticeExt("m_fecha", "m_holiday_notice");
  } catch (e) {
    console.error("Error al cargar feriados en extensión:", e);
  }
}

function checkHolidayNoticeExt(inputId, noticeId) {
  const input = document.getElementById(inputId);
  const notice = document.getElementById(noticeId);
  if (!input || !notice) return;
  const f = extFeriadosMap[input.value];
  if (f) {
    notice.innerHTML = `<span>🇨🇱 <strong>Feriado:</strong> ${f.titulo} ${f.irrenunciable ? '(Irrenunciable)' : ''}</span>`;
    notice.style.display = "flex";
  } else {
    notice.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const todayStr = new Date().toISOString().split("T")[0];
  const elCFecha = document.getElementById("c_fecha");
  if (elCFecha) {
    elCFecha.value = todayStr;
    elCFecha.addEventListener("change", () => checkHolidayNoticeExt("c_fecha", "c_holiday_notice"));
  }
  const elMFecha = document.getElementById("m_fecha");
  if (elMFecha) {
    elMFecha.value = todayStr;
    elMFecha.addEventListener("change", () => checkHolidayNoticeExt("m_fecha", "m_holiday_notice"));
  }

  checkConnection();
  initTabs();
  initTimerState();
  initManualForm();
  loadSugerenciasExt();
  loadFeriadosExt();

  const extHeader = document.getElementById("ext-quick-header");
  const extChips = document.getElementById("ext-chips");
  const extToggle = document.getElementById("ext-quick-toggle");
  if (extHeader && extChips) {
    extHeader.addEventListener("click", () => {
      const isHidden = extChips.style.display === "none" || extChips.style.display === "";
      if (isHidden) {
        extChips.style.display = "flex";
        if (extToggle) extToggle.textContent = "▲ Ocultar";
      } else {
        extChips.style.display = "none";
        if (extToggle) extToggle.textContent = "▼ Mostrar";
      }
    });
  }

  document.getElementById("btnOpenApp").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://127.0.0.1:5000" });
  });
});

// 1. Verificar si el sistema local está corriendo en la PC
async function checkConnection() {
  const badge = document.getElementById("statusBadge");
  try {
    const res = await fetch(`${API_URL}/recordatorio`, { method: "GET" });
    if (res.ok) {
      badge.textContent = "🟢 Conectado a tu PC";
      badge.className = "badge connected";
      loadSugerenciasExt();
    } else {
      throw new Error("No Ok");
    }
  } catch (err) {
    badge.textContent = "🔴 App de PC cerrada";
    badge.className = "badge disconnected";
  }
}

// 2. Sistema de Pestañas
function initTabs() {
  const btnCrono = document.getElementById("tabCronometro");
  const btnManual = document.getElementById("tabManual");
  const viewCrono = document.getElementById("viewCronometro");
  const viewManual = document.getElementById("viewManual");

  btnCrono.addEventListener("click", () => {
    btnCrono.classList.add("active");
    btnManual.classList.remove("active");
    viewCrono.classList.add("active");
    viewManual.classList.remove("active");
  });

  btnManual.addEventListener("click", () => {
    btnManual.classList.add("active");
    btnCrono.classList.remove("active");
    viewManual.classList.add("active");
    viewCrono.classList.remove("active");
  });
}

// 3. Lógica del Cronómetro Persistente (sobrevive cerrar el popup o navegador)
function initTimerState() {
  chrome.storage.local.get(
    ["isRunning", "isPaused", "startTime", "elapsedMs", "lugar", "actividad", "comentario"],
    (res) => {
      if (res.lugar) document.getElementById("c_lugar").value = res.lugar;
      if (res.actividad) document.getElementById("c_actividad").value = res.actividad;
      if (res.comentario) document.getElementById("c_comentario").value = res.comentario;

      if (res.isRunning) {
        startUIUpdate(res.startTime, res.elapsedMs || 0);
        showButtons("running");
      } else if (res.isPaused) {
        updateClockDisplay(res.elapsedMs || 0);
        showButtons("paused");
      } else {
        updateClockDisplay(0);
        showButtons("stopped");
      }
    }
  );

  document.getElementById("btnStart").addEventListener("click", () => {
    const lugar = document.getElementById("c_lugar").value;
    const actividad = document.getElementById("c_actividad").value;
    const comentario = document.getElementById("c_comentario").value;
    const now = Date.now();

    chrome.storage.local.set({
      isRunning: true,
      isPaused: false,
      startTime: now,
      elapsedMs: 0,
      lugar,
      actividad,
      comentario
    });

    startUIUpdate(now, 0);
    showButtons("running");
  });

  document.getElementById("btnPause").addEventListener("click", () => {
    chrome.storage.local.get(["startTime", "elapsedMs"], (res) => {
      const now = Date.now();
      const newElapsed = (res.elapsedMs || 0) + (now - res.startTime);
      clearInterval(timerInterval);

      chrome.storage.local.set({
        isRunning: false,
        isPaused: true,
        elapsedMs: newElapsed
      });

      updateClockDisplay(newElapsed);
      showButtons("paused");
    });
  });

  document.getElementById("btnResume").addEventListener("click", () => {
    chrome.storage.local.get(["elapsedMs", "lugar", "actividad", "comentario"], (res) => {
      const now = Date.now();
      chrome.storage.local.set({
        isRunning: true,
        isPaused: false,
        startTime: now
      });

      startUIUpdate(now, res.elapsedMs || 0);
      showButtons("running");
    });
  });

  document.getElementById("btnStopSave").addEventListener("click", () => {
    chrome.storage.local.get(["isRunning", "startTime", "elapsedMs", "lugar", "actividad", "comentario"], async (res) => {
      clearInterval(timerInterval);
      let totalMs = res.elapsedMs || 0;
      if (res.isRunning && res.startTime) {
        totalMs += (Date.now() - res.startTime);
      }

      // Calcular horas en decimal (ej. 1 hr 30 min = 1.5 horas)
      let horas = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
      if (horas < 0.01 && totalMs > 0) horas = 0.01; // Mínimo 0.01 si cronometró poco tiempo

      const lugar = res.lugar || document.getElementById("c_lugar").value;
      const actividad = res.actividad || document.getElementById("c_actividad").value;
      const comentario = res.comentario || document.getElementById("c_comentario").value;
      const fecha = document.getElementById("c_fecha") ? document.getElementById("c_fecha").value : null;

      await guardarRegistroEnSistema(lugar, actividad, horas, comentario, fecha);

      // Limpiar cronómetro
      chrome.storage.local.remove(["isRunning", "isPaused", "startTime", "elapsedMs", "comentario"]);
      document.getElementById("c_comentario").value = "";
      updateClockDisplay(0);
      showButtons("stopped");
    });
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    clearInterval(timerInterval);
    chrome.storage.local.remove(["isRunning", "isPaused", "startTime", "elapsedMs", "comentario"]);
    document.getElementById("c_comentario").value = "";
    updateClockDisplay(0);
    showButtons("stopped");
    showToast("🔄 Cronómetro reiniciado a 00:00:00", "checking");
  });
}

function startUIUpdate(startTime, baseElapsed) {
  clearInterval(timerInterval);
  const container = document.getElementById("timerContainer");
  container.className = "timer-display running";

  const update = () => {
    const currentMs = baseElapsed + (Date.now() - startTime);
    updateClockDisplay(currentMs);
  };
  update();
  timerInterval = setInterval(update, 1000);
}

function updateClockDisplay(ms) {
  const container = document.getElementById("timerContainer");
  if (!timerInterval) {
    container.className = ms > 0 ? "timer-display paused" : "timer-display";
  }

  const totalSegs = Math.floor(ms / 1000);
  const horas = Math.floor(totalSegs / 3600);
  const minutos = Math.floor((totalSegs % 3600) / 60);
  const segundos = totalSegs % 60;

  const fmt = (n) => String(n).padStart(2, "0");
  document.getElementById("timerClock").textContent = `${fmt(horas)}:${fmt(minutos)}:${fmt(segundos)}`;

  const decimalHrs = (ms / (1000 * 60 * 60)).toFixed(2);
  document.getElementById("timerHours").textContent = `(${decimalHrs} hrs acumuladas)`;
}

function showButtons(state) {
  const start = document.getElementById("btnStart");
  const pause = document.getElementById("btnPause");
  const resume = document.getElementById("btnResume");
  const stop = document.getElementById("btnStopSave");
  const reset = document.getElementById("btnReset");

  start.style.display = state === "stopped" ? "flex" : "none";
  pause.style.display = state === "running" ? "flex" : "none";
  resume.style.display = state === "paused" ? "flex" : "none";
  stop.style.display = state !== "stopped" ? "flex" : "none";
  if (reset) reset.style.display = state !== "stopped" ? "flex" : "none";
}

// 4. Lógica de Ingreso Manual
function initManualForm() {
  document.querySelectorAll(".btn-quick-h").forEach(btn => {
    btn.addEventListener("click", () => {
      const inputH = document.getElementById("m_horas");
      if (inputH) inputH.value = btn.dataset.val;
    });
  });

  document.getElementById("btnSaveManual").addEventListener("click", async () => {
    const lugar = document.getElementById("m_lugar").value;
    const actividad = document.getElementById("m_actividad").value;
    const horas = parseFloat(document.getElementById("m_horas").value || 0);
    const comentario = document.getElementById("m_comentario").value.trim();
    const fecha = document.getElementById("m_fecha") ? document.getElementById("m_fecha").value : null;

    if (horas <= 0) {
      showToast("Por favor ingresa un número de horas mayor a 0", "error");
      return;
    }

    const exito = await guardarRegistroEnSistema(lugar, actividad, horas, comentario, fecha);
    if (exito) {
      document.getElementById("m_horas").value = "";
      document.getElementById("m_comentario").value = "";
    }
  });
}

// 5. Envío al servidor Flask (Excel y Base de Datos)
async function guardarRegistroEnSistema(lugar, actividad, horas, comentario, fechaParam) {
  try {
    const fecha = fechaParam || new Date().toISOString().split("T")[0];
    const res = await fetch(`${API_URL}/registros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha, lugar, actividad, horas, comentario })
    });

    const data = await res.json();
    if (res.ok && data.status === "success") {
      showToast(`✨ ¡Guardado! ${horas} hrs de "${actividad}" en tu Excel.`, "success");
      checkConnection();
      loadSugerenciasExt();
      return true;
    } else {
      throw new Error(data.message || "Error al guardar");
    }
  } catch (err) {
    showToast(`⚠️ Error: ${err.message}. ¿Está abierta tu app en la PC?`, "error");
    return false;
  }
}

async function loadSugerenciasExt() {
  try {
    const res = await fetch(`${API_URL}/sugerencias`);
    if (!res.ok) return;
    const result = await res.json();
    if (result.status === "success") {
      const data = result.data;
      const dlLugar = document.getElementById("lugar_list");
      if (dlLugar && data.lugares) {
        dlLugar.innerHTML = data.lugares.map(l => `<option value="${l}"></option>`).join("");
      }
      const dlAct = document.getElementById("actividad_list");
      if (dlAct && data.actividades) {
        dlAct.innerHTML = data.actividades.map(a => `<option value="${a}"></option>`).join("");
      }
      
      const extQuickFill = document.getElementById("ext-quick-fill");
      const extChips = document.getElementById("ext-chips");
      if (extQuickFill && extChips) {
        if (data.recientes && data.recientes.length > 0) {
          extQuickFill.style.display = "block";
          extChips.innerHTML = data.recientes.map(item => {
            const label = `${item.lugar} | ${item.actividad} (${item.horas}h)`;
            return `
              <div class="ext-chip" title="Rellenar datos automáticamente"
                   data-lugar="${item.lugar}"
                   data-actividad="${item.actividad}"
                   data-horas="${item.horas}"
                   data-comentario="${item.comentario}">
                <span>⚡ ${label}</span>
              </div>
            `;
          }).join("");
          
          extChips.querySelectorAll(".ext-chip").forEach(chip => {
            chip.addEventListener("click", () => {
              const cLugar = document.getElementById("c_lugar");
              const cAct = document.getElementById("c_actividad");
              const cCom = document.getElementById("c_comentario");
              if (cLugar) cLugar.value = chip.dataset.lugar || "";
              if (cAct) cAct.value = chip.dataset.actividad || "";
              if (cCom) cCom.value = chip.dataset.comentario || "";
              
              const mLugar = document.getElementById("m_lugar");
              const mAct = document.getElementById("m_actividad");
              const mHoras = document.getElementById("m_horas");
              const mCom = document.getElementById("m_comentario");
              if (mLugar) mLugar.value = chip.dataset.lugar || "";
              if (mAct) mAct.value = chip.dataset.actividad || "";
              if (mHoras) mHoras.value = chip.dataset.horas || "";
              if (mCom) mCom.value = chip.dataset.comentario || "";
              
              showToast("⚡ Datos pre-cargados desde historial", "checking");
            });
          });
        } else {
          extQuickFill.style.display = "none";
        }
      }
    }
  } catch (err) {
    console.error("Error cargando sugerencias en extensión:", err);
  }
}

function showToast(msg, type) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 4000);
}
