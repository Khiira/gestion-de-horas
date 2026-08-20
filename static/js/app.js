let chartLugar = null;
let chartActividad = null;
let chartTendencia = null;

const PALETTE = [
  '#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ec4899', 
  '#8b5cf6', '#14b8a6', '#3b82f6', '#f97316', '#ef4444'
];

let feriadosChileMap = {};

async function loadFeriadosChile(year = new Date().getFullYear()) {
  try {
    const res = await fetch(`/api/feriados?year=${year}`);
    if (!res.ok) return;
    const result = await res.json();
    if (result.status === 'success' && result.data) {
      result.data.forEach(f => {
        feriadosChileMap[f.fecha] = {
          title: f.titulo,
          inalienable: f.irrenunciable === true || f.irrenunciable === 1,
          type: f.tipo || 'Civil'
        };
      });
    }
  } catch (err) {
    console.error("Error al cargar feriados de Chile:", err);
  }
}

function checkHolidayNotice(dateStr, noticeElemId) {
  const elNotice = document.getElementById(noticeElemId);
  if (!elNotice) return;
  const f = feriadosChileMap[dateStr];
  if (f) {
    elNotice.innerHTML = `<i class="fa-solid fa-flag" style="color: #ef4444;"></i> <span><strong>Feriado de Chile (${escapeHtml(f.title)})</strong> ${f.inalienable ? '— <span style="color:#f87171;">Irrenunciable</span>' : ''}. Puedes registrar o seleccionar horas en festivo si corresponde.</span>`;
    elNotice.style.display = 'flex';
  } else {
    elNotice.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
      const hoy = new Date().toISOString().split('T')[0];
      fechaInput.value = hoy;
      fechaInput.addEventListener('change', () => {
        checkHolidayNotice(fechaInput.value, 'fecha-holiday-notice');
      });
    }
    const editFechaInput = document.getElementById('edit-fecha');
    if (editFechaInput) {
      editFechaInput.addEventListener('change', () => {
        checkHolidayNotice(editFechaInput.value, 'edit-fecha-holiday-notice');
      });
    }
    loadFeriadosChile().then(() => {
      if (fechaInput) checkHolidayNotice(fechaInput.value, 'fecha-holiday-notice');
      if (typeof refreshViews === 'function') refreshViews();
    });
  } catch (e) {
    console.error("Error inicializando fecha:", e);
  }
  
  // Lógica para Colapsar/Mostrar el Dashboard con validación defensiva de DOM
  try {
    const dashboardToggle = document.getElementById('dashboard-toggle-header');
    const dashboardContent = document.getElementById('dashboard-content');
    const toggleBtnText = document.getElementById('toggle-btn-text');
    
    if (dashboardToggle && dashboardContent && toggleBtnText) {
      const isCollapsed = localStorage.getItem('dashboard_collapsed') === 'true';
      if (isCollapsed) {
        dashboardContent.classList.add('collapsed');
        toggleBtnText.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Mostrar Gráficos';
      } else {
        toggleBtnText.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Ocultar Gráficos';
      }
      
      dashboardToggle.addEventListener('click', () => {
        const willCollapse = !dashboardContent.classList.contains('collapsed');
        if (willCollapse) {
          dashboardContent.classList.add('collapsed');
          toggleBtnText.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Mostrar Gráficos';
          localStorage.setItem('dashboard_collapsed', 'true');
        } else {
          dashboardContent.classList.remove('collapsed');
          toggleBtnText.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Ocultar Gráficos';
          localStorage.setItem('dashboard_collapsed', 'false');
        }
      });
    }
  } catch (e) {
    console.error("Error en toggle de dashboard:", e);
  }
  
  // Botones rápidos de horas
  try {
    document.querySelectorAll('.hours-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const horasInput = document.getElementById('horas');
        if (horasInput) horasInput.value = btn.dataset.val;
      });
    });
  } catch (e) {
    console.error("Error en botones rápidos:", e);
  }
  
  // Carga inicial de datos
  loadDashboard();
  loadRegistros();
  loadSugerencias();
  initQuickFillToggle();
  
  try {
    initViewsSystem();
    initDailyView();
    initCalendarView();
    initAgendaView();
  } catch(e) {
    console.error("Error en sistema de vistas:", e);
  }
  
  const formRegistro = document.getElementById('form-registro');
  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();
      await createRegistro();
    });
  }
  
  const formAgendaMain = document.getElementById('form-agenda-main');
  if (formAgendaMain) {
    formAgendaMain.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveAgendaTareaFromMain();
    });
  }
  
  const formEdit = document.getElementById('form-edit');
  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveEditRegistro();
    });
  }

  const formConvertir = document.getElementById('form-convertir');
  if (formConvertir) {
    formConvertir.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitConvertirTarea();
    });
  }
  
  const filterLugar = document.getElementById('filter-lugar');
  if (filterLugar) filterLugar.addEventListener('change', loadRegistros);
  
  const filterActividad = document.getElementById('filter-actividad');
  if (filterActividad) filterActividad.addEventListener('change', loadRegistros);
  
  const filterSearch = document.getElementById('filter-search');
  if (filterSearch) filterSearch.addEventListener('input', debounce(loadRegistros, 300));
  
  const btnExcel = document.getElementById('btn-export-excel');
  if (btnExcel) btnExcel.addEventListener('click', () => exportData('excel'));
  
  const btnCsv = document.getElementById('btn-export-csv');
  if (btnCsv) btnCsv.addEventListener('click', () => exportData('csv'));

  const btnConfigAlarmas = document.getElementById('btn-config-alarmas');
  if (btnConfigAlarmas) {
    btnConfigAlarmas.addEventListener('click', openConfigAlarmasModal);
  }

  const formConfigAlarmas = document.getElementById('form-config-alarmas');
  if (formConfigAlarmas) {
    formConfigAlarmas.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveConfigAlarmas();
    });
  }

  // Cargar estado inicial del header de alarmas
  checkAndRefreshHeaderConfig();
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const result = await res.json();
    if (result.status === 'success') {
      const data = result.data;
      
      const elHoy = document.getElementById('kpi-hoy');
      if (elHoy) elHoy.textContent = data.totales.hoy.toFixed(1);
      const elHoyInt = document.getElementById('kpi-hoy-interno');
      if (elHoyInt) elHoyInt.textContent = data.totales.hoy_interno ? data.totales.hoy_interno.toFixed(1) : "0.0";
      
      const elSem = document.getElementById('kpi-semana');
      if (elSem) elSem.textContent = data.totales.semana.toFixed(1);
      const elSemInt = document.getElementById('kpi-semana-interno');
      if (elSemInt) elSemInt.textContent = data.totales.semana_interno ? data.totales.semana_interno.toFixed(1) : "0.0";
      
      const elMes = document.getElementById('kpi-mes');
      if (elMes) elMes.textContent = data.totales.mes.toFixed(1);
      const elMesInt = document.getElementById('kpi-mes-interno');
      if (elMesInt) elMesInt.textContent = data.totales.mes_interno ? data.totales.mes_interno.toFixed(1) : "0.0";
      
      const elGen = document.getElementById('kpi-general');
      if (elGen) elGen.textContent = data.totales.general.toFixed(1);
      const elGenInt = document.getElementById('kpi-general-interno');
      if (elGenInt) elGenInt.textContent = data.totales.general_interno ? data.totales.general_interno.toFixed(1) : "0.0";
      
      updateFilterSelects(data.filtros);
      renderCharts(data.por_lugar, data.por_actividad, data.por_fecha);
    }
  } catch (err) {
    console.error("Error al cargar dashboard:", err);
  }
}

function updateFilterSelects(filtros) {
  const selectLugar = document.getElementById('filter-lugar');
  const selectAct = document.getElementById('filter-actividad');
  
  if (selectLugar) {
    const currentLugar = selectLugar.value;
    selectLugar.innerHTML = '<option value="Todos">All Clientes/Lugares</option>';
    if (filtros && filtros.lugares) {
      filtros.lugares.forEach(l => {
        selectLugar.innerHTML += `<option value="${l}" ${l === currentLugar ? 'selected' : ''}>${l}</option>`;
      });
    }
  }
  
  if (selectAct) {
    const currentAct = selectAct.value;
    selectAct.innerHTML = '<option value="Todas">Todas las Actividades</option>';
    if (filtros && filtros.actividades) {
      filtros.actividades.forEach(a => {
        selectAct.innerHTML += `<option value="${a}" ${a === currentAct ? 'selected' : ''}>${a}</option>`;
      });
    }
  }
}

function renderCharts(porLugar, porActividad, porFecha) {
  try {
    const elLugar = document.getElementById('chart-lugar');
    if (elLugar && typeof Chart !== 'undefined') {
      const ctxLugar = elLugar.getContext('2d');
      if (chartLugar) chartLugar.destroy();
      chartLugar = new Chart(ctxLugar, {
        type: 'doughnut',
        data: {
          labels: porLugar.map(item => item.lugar),
          datasets: [{
            data: porLugar.map(item => item.total_horas),
            backgroundColor: PALETTE,
            borderColor: '#1e293b',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } } }
          }
        }
      });
    }

    const elAct = document.getElementById('chart-actividad');
    if (elAct && typeof Chart !== 'undefined') {
      const ctxAct = elAct.getContext('2d');
      if (chartActividad) chartActividad.destroy();
      chartActividad = new Chart(ctxAct, {
        type: 'bar',
        data: {
          labels: porActividad.map(item => item.actividad),
          datasets: [{
            label: 'Horas',
            data: porActividad.map(item => item.total_horas),
            backgroundColor: '#10b981',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    const elTend = document.getElementById('chart-tendencia');
    if (elTend && typeof Chart !== 'undefined') {
      const ctxTend = elTend.getContext('2d');
      if (chartTendencia) chartTendencia.destroy();
      chartTendencia = new Chart(ctxTend, {
        type: 'line',
        data: {
          labels: porFecha.map(item => item.fecha),
          datasets: [{
            label: 'Horas Trabajadas',
            data: porFecha.map(item => item.total_horas),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#fff',
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  } catch (e) {
    console.error("Error renderizando gráficos:", e);
  }
}

async function loadRegistros() {
  const elLugar = document.getElementById('filter-lugar');
  const elAct = document.getElementById('filter-actividad');
  const elSearch = document.getElementById('filter-search');
  
  const lugar = elLugar ? elLugar.value : '';
  const actividad = elAct ? elAct.value : '';
  const search = elSearch ? elSearch.value : '';
  
  const params = new URLSearchParams();
  if (lugar && lugar !== 'Todos') params.append('lugar', lugar);
  if (actividad && actividad !== 'Todas') params.append('actividad', actividad);
  if (search) params.append('search', search);
  
  try {
    const res = await fetch(`/api/registros?${params.toString()}`);
    const result = await res.json();
    if (result.status === 'success') {
      renderTable(result.data);
    }
  } catch (err) {
    console.error("Error al cargar registros:", err);
  }
}

async function loadSugerencias() {
  try {
    const res = await fetch('/api/sugerencias');
    const result = await res.json();
    if (result.status === 'success') {
      const data = result.data;
      
      const dlLugar = document.getElementById('lugar_list_web');
      if (dlLugar && data.lugares) {
        dlLugar.innerHTML = data.lugares.map(l => `<option value="${escapeHtml(l)}">`).join('');
      }
      
      const dlAct = document.getElementById('actividad_list_web');
      if (dlAct && data.actividades) {
        dlAct.innerHTML = data.actividades.map(a => `<option value="${escapeHtml(a)}">`).join('');
      }
      
      const section = document.getElementById('quick-fill-section');
      const chipsContainer = document.getElementById('quick-fill-chips');
      if (section && chipsContainer) {
        if (data.recientes && data.recientes.length > 0) {
          section.style.display = 'block';
          const isCollapsed = localStorage.getItem('quick_fill_collapsed') === 'true';
          chipsContainer.style.display = isCollapsed ? 'none' : 'flex';
          const txt = document.getElementById('quick-fill-toggle-text');
          const icon = document.getElementById('quick-fill-toggle-icon');
          if (txt) txt.textContent = isCollapsed ? 'Mostrar' : 'Ocultar';
          if (icon) icon.className = isCollapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';

          chipsContainer.innerHTML = data.recientes.map(item => {
            const label = `${escapeHtml(item.lugar)} | ${escapeHtml(item.actividad)} (${item.horas}h)`;
            return `
              <div class="quick-fill-chip" title="Haz clic para rellenar automáticamente el formulario"
                   data-lugar="${escapeHtml(item.lugar)}" 
                   data-actividad="${escapeHtml(item.actividad)}" 
                   data-horas="${item.horas}" 
                   data-comentario="${escapeHtml(item.comentario)}">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>${label}</span>
              </div>
            `;
          }).join('');
          
          chipsContainer.querySelectorAll('.quick-fill-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              const elLugar = document.getElementById('lugar');
              const elAct = document.getElementById('actividad');
              const elHoras = document.getElementById('horas');
              const elCom = document.getElementById('comentario');
              
              if (elLugar) elLugar.value = chip.dataset.lugar || '';
              if (elAct) elAct.value = chip.dataset.actividad || '';
              if (elHoras) elHoras.value = chip.dataset.horas || '';
              if (elCom) elCom.value = chip.dataset.comentario || '';
              
              showToast("⚡ Datos pre-cargados desde tu historial", "info");
              if (elHoras) elHoras.focus();
            });
          });
        } else {
          section.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.error("Error cargando sugerencias:", err);
  }
}

function initQuickFillToggle() {
  const header = document.getElementById('quick-fill-header');
  const chips = document.getElementById('quick-fill-chips');
  if (!header || !chips) return;
  
  header.addEventListener('click', () => {
    const txt = document.getElementById('quick-fill-toggle-text');
    const icon = document.getElementById('quick-fill-toggle-icon');
    const currentlyHidden = chips.style.display === 'none' || chips.style.display === '';
    
    if (currentlyHidden) {
      chips.style.display = 'flex';
      if (txt) txt.textContent = 'Ocultar';
      if (icon) icon.className = 'fa-solid fa-chevron-up';
      localStorage.setItem('quick_fill_collapsed', 'false');
    } else {
      chips.style.display = 'none';
      if (txt) txt.textContent = 'Mostrar';
      if (icon) icon.className = 'fa-solid fa-chevron-down';
      localStorage.setItem('quick_fill_collapsed', 'true');
    }
  });
}

function renderTable(registros) {
  const tbody = document.getElementById('table-body');
  const totalHorasElem = document.getElementById('historial-total-horas');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!registros || registros.length === 0) {
    if (totalHorasElem) totalHorasElem.textContent = '0.0';
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fa-regular fa-calendar-xmark"></i>
            <p>No se encontraron registros de horas con los filtros actuales.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  let sumHoras = 0;
  registros.forEach(reg => {
    sumHoras += Number(reg.horas);
    const f = feriadosChileMap[reg.fecha];
    const holidayBadge = f ? ` <span class="badge badge-holiday" title="🇨🇱 Feriado: ${escapeHtml(f.title)}">🇨🇱 Feriado</span>` : '';
    
    const isPersonal = reg.lugar && reg.lugar.toLowerCase().includes('interno');
    const badgeLugarClass = isPersonal ? 'badge-personal' : 'badge';
    const rowBg = isPersonal ? 'background-color: rgba(168, 85, 247, 0.05);' : '';
    
    const tr = document.createElement('tr');
    tr.style.cssText = rowBg;
    tr.innerHTML = `
      <td style="white-space: nowrap;"><strong>${reg.fecha}</strong>${holidayBadge}</td>
      <td><span class="${badgeLugarClass}">${escapeHtml(reg.lugar)}</span></td>
      <td><span class="badge badge-activity">${escapeHtml(reg.actividad)}</span></td>
      <td><span class="hours-tag">${Number(reg.horas).toFixed(1)} h</span></td>
      <td style="color: #cbd5e1; max-width: 320px;">${escapeHtml(reg.comentario || '—')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-outline btn-sm" onclick="openEditModal(${reg.id})" title="Editar registro">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRegistro(${reg.id})" title="Eliminar registro">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (totalHorasElem) {
    totalHorasElem.textContent = sumHoras.toFixed(1);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function createRegistro() {
  const elFecha = document.getElementById('fecha');
  const elLugar = document.getElementById('lugar');
  const elHoras = document.getElementById('horas');
  const elAct = document.getElementById('actividad');
  const elCom = document.getElementById('comentario');
  
  const fecha = elFecha ? elFecha.value : '';
  const lugar = elLugar ? elLugar.value : '';
  const horas = elHoras ? elHoras.value : '';
  const actividad = elAct ? elAct.value : '';
  const comentario = elCom ? elCom.value : '';
  
  if (!lugar || !actividad || !horas || Number(horas) <= 0) {
    showToast("Por favor completa el lugar, la actividad y las horas (mayor a 0)", "error");
    return;
  }
  
  try {
    const res = await fetch('/api/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, lugar, horas: Number(horas), actividad, comentario })
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast("¡Registro guardado exitosamente!", "success");
      if (elLugar) elLugar.value = '';
      if (elHoras) elHoras.value = '';
      if (elAct) elAct.value = '';
      if (elCom) elCom.value = '';
      
      loadDashboard();
      loadRegistros();
      loadSugerencias();
      if (typeof refreshViews === 'function') refreshViews();
    } else {
      showToast(result.message || "Error al guardar", "error");
    }
  } catch (err) {
    showToast("Error de conexión con el servidor", "error");
  }
}

async function deleteRegistro(id) {
  if (!confirm("¿Estás seguro de que deseas eliminar este registro de horas?")) return;
  
  try {
    const res = await fetch(`/api/registros/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Registro eliminado", "success");
      loadDashboard();
      loadRegistros();
      loadSugerencias();
      if (typeof refreshViews === 'function') refreshViews();
    } else {
      showToast("No se pudo eliminar", "error");
    }
  } catch (err) {
    showToast("Error al eliminar", "error");
  }
}

let currentEditId = null;

async function openEditModal(id) {
  try {
    const res = await fetch('/api/registros');
    const result = await res.json();
    const reg = result.data.find(r => r.id === id);
    if (!reg) return;
    
    currentEditId = id;
    const elF = document.getElementById('edit-fecha');
    const elL = document.getElementById('edit-lugar');
    const elH = document.getElementById('edit-horas');
    const elA = document.getElementById('edit-actividad');
    const elC = document.getElementById('edit-comentario');
    
    if (elF) elF.value = reg.fecha;
    if (elL) elL.value = reg.lugar;
    if (elH) elH.value = reg.horas;
    if (elA) elA.value = reg.actividad;
    if (elC) elC.value = reg.comentario || '';
    
    checkHolidayNotice(reg.fecha, 'edit-fecha-holiday-notice');
    
    const modal = document.getElementById('modal-edit');
    if (modal) modal.classList.add('active');
  } catch (err) {
    console.error(err);
  }
}

function closeEditModal() {
  const modal = document.getElementById('modal-edit');
  if (modal) modal.classList.remove('active');
  currentEditId = null;
}

async function saveEditRegistro() {
  if (!currentEditId) return;
  
  const elF = document.getElementById('edit-fecha');
  const elL = document.getElementById('edit-lugar');
  const elH = document.getElementById('edit-horas');
  const elA = document.getElementById('edit-actividad');
  const elC = document.getElementById('edit-comentario');
  
  const fecha = elF ? elF.value : '';
  const lugar = elL ? elL.value : '';
  const horas = elH ? elH.value : '';
  const actividad = elA ? elA.value : '';
  const comentario = elC ? elC.value : '';
  
  try {
    const res = await fetch(`/api/registros/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, lugar, horas: Number(horas), actividad, comentario })
    });
    
    if (res.ok) {
      showToast("Registro actualizado correctamente", "success");
      closeEditModal();
      loadDashboard();
      loadRegistros();
      loadSugerencias();
      if (typeof refreshViews === 'function') refreshViews();
    } else {
      showToast("Error al actualizar", "error");
    }
  } catch (err) {
    showToast("Error de conexión", "error");
  }
}

function exportData(format) {
  const elLugar = document.getElementById('filter-lugar');
  const elAct = document.getElementById('filter-actividad');
  const elSearch = document.getElementById('filter-search');
  
  const lugar = elLugar ? elLugar.value : '';
  const actividad = elAct ? elAct.value : '';
  const search = elSearch ? elSearch.value : '';
  
  const params = new URLSearchParams();
  if (lugar && lugar !== 'Todos') params.append('lugar', lugar);
  if (actividad && actividad !== 'Todas') params.append('actividad', actividad);
  if (search) params.append('search', search);
  
  window.location.href = `/api/export/${format}?${params.toString()}`;
}

function showToast(message, type = "success") {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-bell' : 'fa-exclamation-triangle'}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ==========================================
   SISTEMA DE VISTAS Y TABS DE TRABAJO
   ========================================== */
let activeView = localStorage.getItem('active_view_tab') || 'daily';
let currentDailyDate = new Date().toISOString().split('T')[0];
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth(); // 0 a 11
let dailyTargetHours = Number(localStorage.getItem('daily_target_hours') || 8.0);
let currentDailyRecords = [];

function initViewsSystem() {
  const tabBtns = document.querySelectorAll('.view-tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      switchView(targetView);
    });
  });
  
  switchView(activeView, false);
}

function switchView(viewName, showNotification = false) {
  activeView = viewName;
  localStorage.setItem('active_view_tab', viewName);
  
  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  document.querySelectorAll('.view-pane').forEach(pane => {
    if (pane.id === `view-${viewName}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
  
  refreshViews();
}

function refreshViews() {
  if (activeView === 'daily') {
    loadDailyView(currentDailyDate);
  } else if (activeView === 'calendar') {
    loadCalendarView(currentCalYear, currentCalMonth);
  } else if (activeView === 'history') {
    loadRegistros();
  } else if (activeView === 'agenda') {
    loadAgendaView();
  }
}

/* ==========================================
   VISTA 1: ENFOQUE DIARIO (TRANQUILIDAD)
   ========================================== */
function initDailyView() {
  const btnPrev = document.getElementById('btn-prev-day');
  const btnNext = document.getElementById('btn-next-day');
  const btnToday = document.getElementById('btn-today-day');
  const datePicker = document.getElementById('daily-date-picker');
  const btnEditTarget = document.getElementById('btn-edit-target');
  const targetLabel = document.getElementById('daily-hours-target');
  
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentDailyDate = changeDateByDays(currentDailyDate, -1);
      loadDailyView(currentDailyDate);
    });
  }
  
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentDailyDate = changeDateByDays(currentDailyDate, 1);
      loadDailyView(currentDailyDate);
    });
  }
  
  if (btnToday) {
    btnToday.addEventListener('click', () => {
      currentDailyDate = new Date().toISOString().split('T')[0];
      loadDailyView(currentDailyDate);
    });
  }
  
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        currentDailyDate = e.target.value;
        loadDailyView(currentDailyDate);
      }
    });
  }
  
  const handleEditTarget = () => {
    const newVal = prompt("¿Cuál es tu meta diaria de horas trabajadas (ej. 8.0, 6.0, 4.0)?", dailyTargetHours);
    if (newVal !== null && !isNaN(newVal) && Number(newVal) > 0) {
      dailyTargetHours = Number(newVal);
      localStorage.setItem('daily_target_hours', dailyTargetHours);
      if (targetLabel) targetLabel.textContent = dailyTargetHours.toFixed(1);
      showToast(`🎯 Meta diaria actualizada a ${dailyTargetHours.toFixed(1)} horas`, "success");
      loadDailyView(currentDailyDate);
    }
  };

  if (btnEditTarget) btnEditTarget.addEventListener('click', handleEditTarget);
  if (targetLabel) targetLabel.addEventListener('click', handleEditTarget);
  
  loadDailyView(currentDailyDate);
}

function changeDateByDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatSpanishDate(dateStr) {
  if (!dateStr) return 'Sin fecha programada';
  const d = new Date(dateStr + 'T00:00:00');
  const hoyStr = new Date().toISOString().split('T')[0];
  const ayerStr = changeDateByDays(hoyStr, -1);
  const mananaStr = changeDateByDays(hoyStr, 1);
  
  const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  let formateada = d.toLocaleDateString('es-ES', opciones);
  formateada = formateada.charAt(0).toUpperCase() + formateada.slice(1);
  
  if (dateStr === hoyStr) {
    return `Hoy: ${formateada}`;
  } else if (dateStr === ayerStr) {
    return `Ayer: ${formateada}`;
  } else if (dateStr === mananaStr) {
    return `Mañana: ${formateada}`;
  }
  return formateada;
}

async function loadDailyView(dateStr) {
  try {
    const elPicker = document.getElementById('daily-date-picker');
    const elLabel = document.getElementById('daily-date-label');
    const elTarget = document.getElementById('daily-hours-target');
    const elCount = document.getElementById('daily-hours-count');
    const elFill = document.getElementById('daily-progress-fill');
    const elMsg = document.getElementById('daily-tranquility-msg');
    const elBadge = document.getElementById('daily-count-badge');
    const elContainer = document.getElementById('daily-list-container');
    
    if (elPicker && elPicker.value !== dateStr) elPicker.value = dateStr;
    if (elLabel) elLabel.textContent = formatSpanishDate(dateStr);
    if (elTarget) elTarget.textContent = dailyTargetHours.toFixed(1);
    
    // Sincronizar campo fecha del formulario de la izquierda con la fecha actual del visor
    const formFecha = document.getElementById('fecha');
    if (formFecha && formFecha.value !== dateStr) {
      formFecha.value = dateStr;
    }
    
    const res = await fetch(`/api/registros?fecha_inicio=${dateStr}&fecha_fin=${dateStr}`);
    const result = await res.json();
    
    if (result.status === 'success') {
      currentDailyRecords = result.data || [];
      const totalHours = currentDailyRecords.reduce((sum, r) => sum + Number(r.horas), 0);
      
      if (elCount) elCount.textContent = totalHours.toFixed(1);
      
      // Porcentaje de barra de progreso
      const pct = Math.min(100, (totalHours / dailyTargetHours) * 100);
      if (elFill) elFill.style.width = `${pct}%`;
      
      // Mensaje motivador de tranquilidad
      if (elMsg) {
        if (totalHours === 0) {
          elMsg.innerHTML = '🌱 <strong>Día limpio.</strong> ¡Comienza a registrar tu tiempo con tranquilidad cuando estés listo!';
        } else if (totalHours < dailyTargetHours * 0.5) {
          elMsg.innerHTML = `🚀 <strong>Buen comienzo.</strong> Llevas ${totalHours.toFixed(1)}h registradas en este bloque. ¡Sigue adelante a tu ritmo!`;
        } else if (totalHours < dailyTargetHours) {
          const falta = (dailyTargetHours - totalHours).toFixed(1);
          elMsg.innerHTML = `⚡ <strong>¡Gran ritmo de trabajo!</strong> Llevas ${totalHours.toFixed(1)}h. Solo faltan ${falta}h para tu objetivo diario.`;
        } else if (totalHours === dailyTargetHours || totalHours <= dailyTargetHours + 0.5) {
          elMsg.innerHTML = `✨ <strong>¡Objetivo de la jornada cumplido!</strong> Has alcanzado tus ${dailyTargetHours.toFixed(1)} horas. ¡Excelente trabajo y dedicación!`;
        } else {
          const extra = (totalHours - dailyTargetHours).toFixed(1);
          elMsg.innerHTML = `🔥 <strong>¡Superaste tu meta en ${extra}h!</strong> Has registrado ${totalHours.toFixed(1)}h hoy. Recuerda descansar y desconectar.`;
        }
      }
      
      const summaryContainer = document.getElementById('daily-summary-container');
      if (summaryContainer) {
        if (currentDailyRecords.length > 0) {
          const summary = {};
          currentDailyRecords.forEach(r => {
            const loc = r.lugar || 'Desconocido';
            summary[loc] = (summary[loc] || 0) + Number(r.horas);
          });
          let html = `<div style="width: 100%; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;"><i class="fa-solid fa-chart-pie"></i> Resumen de horas por Cliente/Proyecto:</div>`;
          for (const [loc, hrs] of Object.entries(summary)) {
            const isPersonal = loc.toLowerCase().includes('interno');
            const badgeStyle = isPersonal
              ? 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 12px; padding: 4px 8px; border-radius: 6px;'
              : 'background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); font-size: 12px; padding: 4px 8px; border-radius: 6px;';
            const icon = isPersonal ? 'fa-house-user' : 'fa-building';
            html += `<span style="${badgeStyle}"><i class="fa-solid ${icon}" style="margin-right:4px;"></i> ${escapeHtml(loc)}: <strong>${hrs.toFixed(1)}h</strong></span>`;
          }
          summaryContainer.innerHTML = html;
          summaryContainer.style.display = 'flex';
        } else {
          summaryContainer.style.display = 'none';
        }
      }
      
      const elBanner = document.getElementById('daily-holiday-banner');
      if (elBanner) {
        const feriado = feriadosChileMap[dateStr];
        if (feriado) {
          elBanner.innerHTML = `
            <div class="holiday-alert-icon">
              <i class="fa-solid fa-flag-checkered"></i>
            </div>
            <div class="holiday-alert-content">
              <strong>🇨🇱 ¡Feriado Oficial en Chile! — ${escapeHtml(feriado.title)}</strong>
              <p>${feriado.inalienable ? '🔴 <em>Feriado Irrenunciable.</em> ' : ''}Este día es festivo nacional. Puedes registrar o seleccionar esta fecha para cargar horas en caso de turnos, guardias o trabajo especial en festivo.</p>
            </div>
          `;
          elBanner.style.display = 'flex';
        } else {
          elBanner.style.display = 'none';
        }
      }
      
      if (elBadge) elBadge.textContent = `${currentDailyRecords.length} registro${currentDailyRecords.length !== 1 ? 's' : ''}`;
      
      renderDailyList(currentDailyRecords);
    }
  } catch (err) {
    console.error("Error al cargar la vista diaria:", err);
  }
}

function renderDailyList(registros) {
  const container = document.getElementById('daily-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!registros || registros.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 36px 16px;">
        <i class="fa-solid fa-mug-hot" style="color: #6366f1; font-size: 42px; margin-bottom: 12px;"></i>
        <p style="font-size: 16px; color: var(--text-primary); font-weight: 600; margin-bottom: 6px;">Día despejado y tranquilo</p>
        <p style="font-size: 13.5px; color: var(--text-secondary); max-width: 400px; margin: 0 auto;">No tienes actividades registradas en esta fecha. Usa el formulario izquierdo para añadir bloques de horas sin agobios.</p>
      </div>
    `;
    return;
  }
  
  registros.forEach(reg => {
    const isPersonal = reg.lugar && reg.lugar.toLowerCase().includes('interno');
    const badgeStyle = isPersonal 
      ? 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 12px;'
      : 'background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); font-size: 12px;';
    const cardBg = isPersonal ? 'background-color: rgba(168, 85, 247, 0.05); border-color: rgba(168, 85, 247, 0.2);' : '';
    
    const card = document.createElement('div');
    card.className = 'daily-activity-card';
    if (isPersonal) card.style.cssText = cardBg;
    card.innerHTML = `
      <div class="daily-card-main">
        <div class="daily-card-badges">
          <span class="badge" style="${badgeStyle}">
            <i class="fa-solid ${isPersonal ? 'fa-house-user' : 'fa-building'}" style="margin-right: 4px;"></i> ${escapeHtml(reg.lugar)}
          </span>
          <span class="badge badge-activity" style="font-size: 12px;">
            <i class="fa-solid fa-tag" style="margin-right: 4px;"></i> ${escapeHtml(reg.actividad)}
          </span>
        </div>
        <div class="daily-card-comment">
          ${reg.comentario ? `<i class="fa-regular fa-comment-dots" style="color: #64748b; margin-right: 4px;"></i> ${escapeHtml(reg.comentario)}` : `<span style="color: var(--text-muted); font-style: italic;">Sin comentario adicional</span>`}
        </div>
      </div>
      <div class="daily-card-right">
        <div class="daily-card-hours">
          <i class="fa-regular fa-clock" style="font-size: 16px; margin-right: 4px; color: #38bdf8;"></i> ${Number(reg.horas).toFixed(1)} h
        </div>
        <div class="daily-card-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="copyToForm(${reg.id})" title="Copiar / Repetir en el formulario" style="color: #a5b4fc; border-color: rgba(165, 180, 252, 0.3);">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="openEditModal(${reg.id})" title="Editar registro">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteRegistro(${reg.id})" title="Eliminar registro">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function copyToForm(id) {
  const reg = currentDailyRecords.find(r => r.id === id);
  if (!reg) return;
  
  const elLugar = document.getElementById('lugar');
  const elHoras = document.getElementById('horas');
  const elAct = document.getElementById('actividad');
  const elCom = document.getElementById('comentario');
  
  if (elLugar) elLugar.value = reg.lugar;
  if (elHoras) elHoras.value = reg.horas;
  if (elAct) elAct.value = reg.actividad;
  if (elCom) elCom.value = reg.comentario || '';
  
  showToast("✨ Datos copiados al formulario. ¡Guarda o ajusta el nuevo bloque!", "success");
  
  const formCard = document.getElementById('form-registro')?.closest('.card');
  if (formCard) {
    formCard.style.boxShadow = '0 0 25px rgba(99, 102, 241, 0.6)';
    setTimeout(() => { formCard.style.boxShadow = ''; }, 1200);
  }
}

/* ==========================================
   VISTA 2: CALENDARIO VISUAL DE HORAS
   ========================================== */
const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function initCalendarView() {
  const btnPrev = document.getElementById('btn-prev-month');
  const btnNext = document.getElementById('btn-next-month');
  const btnCurrent = document.getElementById('btn-current-month');
  
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentCalMonth--;
      if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
      }
      loadCalendarView(currentCalYear, currentCalMonth);
    });
  }
  
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentCalMonth++;
      if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
      }
      loadCalendarView(currentCalYear, currentCalMonth);
    });
  }
  
  if (btnCurrent) {
    btnCurrent.addEventListener('click', () => {
      const hoy = new Date();
      currentCalYear = hoy.getFullYear();
      currentCalMonth = hoy.getMonth();
      loadCalendarView(currentCalYear, currentCalMonth);
    });
  }
  
  loadCalendarView(currentCalYear, currentCalMonth);
}

async function loadCalendarView(year, month) {
  try {
    const elLabel = document.getElementById('calendar-month-label');
    const elTotal = document.getElementById('cal-total-hours');
    const elDays = document.getElementById('cal-active-days');
    const elAvg = document.getElementById('cal-avg-hours');
    
    if (elLabel) elLabel.textContent = `${MESES_ES[month]} ${year}`;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstWeekday = new Date(year, month, 1).getDay() - 1;
    if (firstWeekday === -1) firstWeekday = 6;
    
    const startDate = new Date(year, month, 1 - firstWeekday);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const res = await fetch(`/api/registros?fecha_inicio=${startStr}&fecha_fin=${endStr}`);
    const result = await res.json();
    
    if (result.status === 'success') {
      const allRecords = result.data || [];
      
      const recordsByDate = {};
      allRecords.forEach(r => {
        if (!recordsByDate[r.fecha]) recordsByDate[r.fecha] = [];
        recordsByDate[r.fecha].push(r);
      });
      
      let monthTotalHours = 0;
      let activeDaysCount = 0;
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        if (recordsByDate[dStr] && recordsByDate[dStr].length > 0) {
          const sumH = recordsByDate[dStr].reduce((s, r) => s + Number(r.horas), 0);
          if (sumH > 0) {
            monthTotalHours += sumH;
            activeDaysCount++;
          }
        }
      }
      
      const avg = activeDaysCount > 0 ? (monthTotalHours / activeDaysCount) : 0;
      
      if (elTotal) elTotal.textContent = `${monthTotalHours.toFixed(1)} h`;
      if (elDays) elDays.textContent = `${activeDaysCount} día${activeDaysCount !== 1 ? 's' : ''}`;
      if (elAvg) elAvg.textContent = `${avg.toFixed(1)} h/día`;
      
      if (!Object.keys(feriadosChileMap).some(k => k.startsWith(`${year}-`))) {
        await loadFeriadosChile(year);
      }
      renderCalendarGrid(startDate, recordsByDate, year, month);
    }
  } catch (err) {
    console.error("Error al cargar vista de calendario:", err);
  }
}

function renderCalendarGrid(startDate, recordsByDate, currentYear, currentMonth) {
  const container = document.getElementById('calendar-days-container');
  if (!container) return;
  
  container.innerHTML = '';
  const hoyStr = new Date().toISOString().split('T')[0];
  
  let currDate = new Date(startDate);
  
  for (let i = 0; i < 42; i++) {
    const dStr = currDate.toISOString().split('T')[0];
    const dayNum = currDate.getDate();
    const cellYear = currDate.getFullYear();
    const cellMonth = currDate.getMonth();
    
    const isOtherMonth = (cellYear !== currentYear || cellMonth !== currentMonth);
    const isToday = (dStr === hoyStr);
    
    const records = recordsByDate[dStr] || [];
    
    let personalH = 0;
    let workH = 0;
    records.forEach(r => {
      const loc = r.lugar || '';
      if (loc.toLowerCase().includes('interno')) {
        personalH += Number(r.horas);
      } else {
        workH += Number(r.horas);
      }
    });
    const totalH = personalH + workH;
    
    const uniqueItems = [...new Set(records.map(r => r.lugar))];
    const itemsText = uniqueItems.join(', ');
    
    const feriado = feriadosChileMap[dStr];
    let badgeClass = 'cal-badge-low';
    if (workH >= 8) badgeClass = 'cal-badge-full';
    else if (workH >= 4) badgeClass = 'cal-badge-mid';
    
    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${feriado ? 'is-holiday' : ''}`;
    cell.title = `Clic para abrir el Enfoque Diario de esta fecha (${dStr})`;
    
    // Generar tags de horas
    let hourTags = '';
    if (workH > 0) {
      hourTags += `<div class="cal-day-badge ${badgeClass}" title="${workH.toFixed(1)} horas de trabajo">${workH.toFixed(1)} h</div>`;
    }
    if (personalH > 0) {
      hourTags += `<div class="cal-day-badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);" title="${personalH.toFixed(1)} horas internas/personales">${personalH.toFixed(1)} h</div>`;
    }
    
    cell.innerHTML = `
      <div class="cal-day-header">
        <span class="cal-day-num">${dayNum}</span>
        <div style="display: flex; gap: 4px; align-items: center;">
          ${isToday ? `<span style="font-size: 10px; color: var(--primary); font-weight: 700;">HOY</span>` : ''}
          ${feriado ? `<span class="holiday-flag-icon" title="🇨🇱 Feriado: ${escapeHtml(feriado.title)} ${feriado.inalienable ? '(Irrenunciable)' : ''}"><i class="fa-solid fa-flag" style="color: #ef4444;"></i></span>` : ''}
        </div>
      </div>
      <div>
        ${feriado ? `<div class="cal-holiday-tag" title="🇨🇱 ${escapeHtml(feriado.title)}">🇨🇱 ${escapeHtml(feriado.title)}</div>` : ''}
        <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px;">${hourTags}</div>
        ${itemsText ? `<div class="cal-day-items">${escapeHtml(itemsText)}</div>` : ''}
      </div>
    `;
    
    cell.addEventListener('click', () => {
      switchView('daily');
      currentDailyDate = dStr;
      loadDailyView(dStr);
      showToast(`☀️ Mostrando enfoque para: ${formatSpanishDate(dStr)}`, "info");
    });
    
    container.appendChild(cell);
    currDate.setDate(currDate.getDate() + 1);
  }
}

/* ==========================================
   CONFIGURACIÓN DINÁMICA DE ALARMAS Y AVISOS
   ========================================== */
let globalAlarmas = [];

async function openConfigAlarmasModal() {
  const modal = document.getElementById('modal-config-alarmas');
  if (!modal) return;

  try {
    const res = await fetch('/api/recordatorio');
    const result = await res.json();
    if (result.status === 'success' && result.data.config) {
      globalAlarmas = result.data.config.alarmas || [];
      renderAlarmasUI();
    }
  } catch (err) {
    console.error("Error cargando configuración de alarmas:", err);
  }

  modal.classList.add('active');
}

function closeConfigAlarmasModal() {
  const modal = document.getElementById('modal-config-alarmas');
  if (modal) modal.classList.remove('active');
}

function renderAlarmasUI() {
  const container = document.getElementById('alarmas-dinamicas-container');
  if (!container) return;
  container.innerHTML = '';
  
  globalAlarmas.forEach((alm, index) => {
    const isPer = alm.tipo === 'periodica';
    const card = document.createElement('div');
    card.style.background = 'rgba(30, 41, 59, 0.6)';
    card.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    card.style.borderRadius = '12px';
    card.style.padding = '18px';
    card.style.marginBottom = '20px';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; flex-wrap: wrap;">
        <div style="display:flex; align-items:center; gap:8px; flex: 1; min-width: 250px;">
            <i class="fa-solid ${isPer ? 'fa-hourglass-half' : 'fa-calendar-check'}" style="color: ${isPer ? '#6366f1' : '#10b981'}; font-size: 18px;"></i>
            <input type="text" class="form-control" style="background:transparent; border:none; border-bottom:1px solid #475569; padding:2px 4px; font-weight:600; font-size:15px; color:#f8fafc; flex: 1;" value="${alm.nombre}" onchange="updateAlm(${index}, 'nombre', this.value)">
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <select class="form-control" style="width: auto; font-size: 13px; padding: 4px 8px; background: rgba(30, 41, 59, 0.8);" onchange="updateAlm(${index}, 'tipo', this.value); renderAlarmasUI();">
              <option value="periodica" ${isPer ? 'selected' : ''}>Periódica (Minutos)</option>
              <option value="programada" ${!isPer ? 'selected' : ''}>Programada (CRON)</option>
            </select>
            <button type="button" class="btn btn-sm btn-outline" style="border-color:#ef4444; color:#ef4444;" onclick="borrarAlarmaUI(${index})" title="Eliminar Alarma"><i class="fa-solid fa-trash"></i></button>
            <label class="switch" style="display: flex; align-items: center; cursor: pointer;" title="Activar / Desactivar">
                <input type="checkbox" style="width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer;" ${alm.activo ? 'checked' : ''} onchange="updateAlm(${index}, 'activo', this.checked)">
            </label>
        </div>
      </div>
      <div style="margin-bottom: 12px;">
         <label class="form-label" style="margin-bottom:4px; font-size:12px;">Mensaje de Aviso</label>
         <input type="text" class="form-control" style="font-size:13px; padding:6px 10px;" value="${alm.mensaje || ''}" onchange="updateAlm(${index}, 'mensaje', this.value)">
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        ${isPer ? `
          <div style="flex: 1; min-width: 180px;">
            <label class="form-label" style="margin-bottom: 6px;">Frecuencia (Minutos):</label>
            <input type="number" min="1" class="form-control" value="${alm.intervalo_minutos || 60}" onchange="updateAlm(${index}, 'intervalo_minutos', this.value)">
          </div>
        ` : `
          <div style="flex: 1; min-width: 250px;">
            <label class="form-label" style="margin-bottom: 6px;">Expresión CRON: <a href="https://crontab.guru/" target="_blank" style="color: #818cf8; font-size: 11px; text-decoration: underline; margin-left: 6px;">(Ayuda: crontab.guru)</a></label>
            <input type="text" class="form-control" value="${alm.cron || '0 17 * * 5'}" required onchange="updateAlm(${index}, 'cron', this.value)" placeholder="* * * * *">
          </div>
        `}
        <div style="padding-top: 22px; display: flex; gap: 8px;">
          <input type="file" id="audio-file-${alm.id}" accept=".wav,.mp3" style="display: none;" onchange="uploadAudio('${alm.id}')">
          <button type="button" class="btn btn-outline" style="border-color: rgba(99, 102, 241, 0.4); color: #818cf8; font-size: 13px; padding: 8px 14px;" onclick="document.getElementById('audio-file-${alm.id}').click()" title="Subir archivo de audio">
            <i class="fa-solid fa-music"></i> Audio
          </button>
          <button type="button" class="btn btn-outline" style="border-color: rgba(99, 102, 241, 0.4); color: #818cf8; font-size: 13px; padding: 8px 14px;" onclick="testAlarmaByID('${alm.id}')">
            <i class="fa-solid fa-play"></i> Probar
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateAlm(index, prop, val) {
    if(prop === 'intervalo_minutos') val = Number(val);
    if(prop === 'dia_semana') val = Number(val);
    globalAlarmas[index][prop] = val;
}

function borrarAlarmaUI(index) {
    if(confirm("¿Seguro que deseas eliminar esta alarma?")) {
        globalAlarmas.splice(index, 1);
        renderAlarmasUI();
    }
}

function agregarNuevaAlarmaUI() {
    globalAlarmas.push({
        id: "",
        tipo: "periodica",
        nombre: "Nueva Alarma Periódica",
        mensaje: "¡Es hora de prestar atención!",
        activo: true,
        intervalo_minutos: 60,
        cron: "0 10 * * *"
    });
    renderAlarmasUI();
}

async function testAlarmaByID(id) {
    if(!id) {
        showToast("Debes guardar la alarma nueva antes de probarla.", "warning");
        return;
    }
    showToast("Enviando aviso de prueba...", "info");
    try {
        const res = await fetch('/api/recordatorio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'test', alarma_id: id })
        });
        const d = await res.json();
        if(d.status === 'success') showToast("¡Aviso enviado!", 'success');
        else showToast(d.message || "Error al enviar aviso", 'error');
    } catch(e) {
        console.error(e);
        showToast("Error al probar alarma", "error");
    }
}

async function uploadAudio(alarmaId) {
  const fileInput = document.getElementById(`audio-file-${alarmaId}`);
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
  
  const file = fileInput.files[0];
  if (!file.name.toLowerCase().endsWith('.wav') && !file.name.toLowerCase().endsWith('.mp3')) {
    showToast("Por favor, selecciona un archivo .wav o .mp3", "error");
    return;
  }
  
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('alarma_id', alarmaId);
  
  showToast("Subiendo audio...", "info");
  try {
    const res = await fetch('/api/recordatorio/audio', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      showToast(data.message || "Audio subido correctamente", "success");
      fileInput.value = ''; // Reset input
    } else {
      showToast(data.message || "Error al subir el audio.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast(`Error al conectar con el servidor: ${err.message}`, "error");
  }
}

async function saveConfigAlarmas() {
  const config = { alarmas: globalAlarmas };

  try {
    const res = await fetch('/api/recordatorio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'guardar_config', config })
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast("¡Alarmas configuradas y programadas exitosamente!", "success");
      closeConfigAlarmasModal();
      checkAndRefreshHeaderConfig();
    } else {
      showToast(result.message || "Error al guardar", "error");
    }
  } catch (err) {
    showToast("Error al conectar para guardar alarmas", "error");
  }
}

async function checkAndRefreshHeaderConfig() {
  try {
    const res = await fetch('/api/recordatorio');
    const result = await res.json();
    if (result.status === 'success' && result.data.config) {
      const alarmas = result.data.config.alarmas || [];
      const activas = alarmas.filter(a => a.activo).length;
      const descText = `${activas} alarma(s) activa(s)`;

      const headerDesc = document.querySelector('.brand p');
      if (headerDesc) {
        if (result.data.activo) {
            headerDesc.innerHTML = `<i class="fa-solid fa-circle" style="color: #10b981; font-size: 10px; margin-right: 4px;"></i> Sistema activo de fondo | ⏰ ${descText}`;
        } else {
            headerDesc.innerHTML = `<i class="fa-solid fa-circle" style="color: #ef4444; font-size: 10px; margin-right: 4px;"></i> Sistema de alarmas APAGADO`;
        }
      }
      
      const btnToggle = document.getElementById('btn-toggle-global-alarmas');
      if(btnToggle) {
          if (result.data.activo) {
              btnToggle.innerHTML = `<i class="fa-solid fa-power-off"></i> Apagar Sistema de Alarmas`;
              btnToggle.style.color = '#f43f5e';
              btnToggle.style.borderColor = '#f43f5e';
          } else {
              btnToggle.innerHTML = `<i class="fa-solid fa-power-off"></i> Encender Sistema de Alarmas`;
              btnToggle.style.color = '#10b981';
              btnToggle.style.borderColor = '#10b981';
          }
      }
    }
  } catch (err) {
    console.error("Error actualizando subtítulo de alarmas:", err);
  }
}

async function toggleSistemaAlarmas() {
    try {
        const res = await fetch('/api/recordatorio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'toggle' })
        });
        const d = await res.json();
        if(d.status === 'success') {
            showToast(d.message, 'success');
            checkAndRefreshHeaderConfig();
        } else {
            showToast(d.message, 'error');
        }
    } catch(e) {
        showToast("Error al conectar", "error");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnTog = document.getElementById('btn-toggle-global-alarmas');
    if(btnTog) btnTog.addEventListener('click', toggleSistemaAlarmas);
});


/* ==========================================
   LÓGICA DE AGENDA Y PLANNER DE TAREAS
   ========================================== */
let currentAgendaFilterFecha = 'proximas';
let currentAgendaFilterEstado = 'todos';
let currentAgendaTasks = [];

function initAgendaView() {
  const btnNueva = document.getElementById('btn-nueva-tarea-agenda');
  if (btnNueva) {
    btnNueva.addEventListener('click', () => openAgendaModal());
  }

  // Filtros por fecha (Todas, Hoy, Mañana, Próximas)
  document.querySelectorAll('.btn-filter-agenda').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-filter-agenda').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentAgendaFilterFecha = e.target.dataset.fechaFilter;
      loadAgendaView();
    });
  });

  // Filtro por estado (todos, pendiente, en_progreso, completada)
  const selectEstado = document.getElementById('select-filter-estado-agenda');
  if (selectEstado) {
    selectEstado.addEventListener('change', (e) => {
      currentAgendaFilterEstado = e.target.value;
      loadAgendaView();
    });
  }

  // Submit del formulario modal de la agenda
  const formAgenda = document.getElementById('form-agenda');
  if (formAgenda) {
    formAgenda.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveAgendaTarea();
    });
  }
}

async function loadAgendaView() {
  try {
    const container = document.getElementById('agenda-cards-container');
    if (!container) return;

    let url = `/api/agenda?estado=${currentAgendaFilterEstado}`;
    const hoyStr = new Date().toISOString().split('T')[0];

    if (currentAgendaFilterFecha === 'hoy') {
      url += `&fecha=${hoyStr}`;
    } else if (currentAgendaFilterFecha === 'manana') {
      const mananaStr = changeDateByDays(hoyStr, 1);
      url += `&fecha=${mananaStr}`;
    } else if (currentAgendaFilterFecha === 'proximas') {
      url += `&solo_proximas=true`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (result.status === 'success') {
      currentAgendaTasks = result.data || [];
      renderAgendaCards(currentAgendaTasks);
    }
  } catch (err) {
    console.error("Error al cargar la agenda:", err);
  }
}

function renderAgendaCards(tareas) {
  const container = document.getElementById('agenda-cards-container');
  if (!container) return;

  container.innerHTML = '';

  if (!tareas || tareas.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 20px;">
        <i class="fa-solid fa-calendar-check" style="color: #10b981; font-size: 48px; margin-bottom: 14px;"></i>
        <p style="font-size: 16px; color: var(--text-primary); font-weight: 600; margin-bottom: 6px;">No hay tareas agendadas</p>
        <p style="font-size: 13.5px; color: var(--text-secondary); max-width: 420px; margin: 0 auto 16px auto;">
          Organiza tu día agregando tareas con recordatorio previo de 5 a 10 min.
        </p>
        <button type="button" class="btn btn-primary" onclick="openAgendaModal()" style="background: #10b981; border-color: #10b981; margin: 0 auto;">
          <i class="fa-solid fa-plus"></i> + Agendar Primera Tarea
        </button>
      </div>
    `;
    return;
  }

  tareas.forEach(tarea => {
    const card = document.createElement('div');
    card.className = `agenda-card estado-${tarea.estado}`;

    const fechaFormateada = formatSpanishDate(tarea.fecha);
    const estadoPills = {
      'pendiente': `<span class="agenda-status-pill status-pill-pendiente" title="Haz clic para cambiar estado" onclick="cycleTareaEstado(${tarea.id}, 'pendiente')">⏳ Pendiente</span>`,
      'en_progreso': `<span class="agenda-status-pill status-pill-en_progreso" title="Haz clic para cambiar estado" onclick="cycleTareaEstado(${tarea.id}, 'en_progreso')">🔄 En Progreso</span>`,
      'completada': `<span class="agenda-status-pill status-pill-completada" title="Haz clic para cambiar estado" onclick="cycleTareaEstado(${tarea.id}, 'completada')">✅ Completada</span>`
    };

    const minAntesText = tarea.minutos_recordatorio > 0 ? `${tarea.minutos_recordatorio} min antes` : 'A la hora exacta';

    card.innerHTML = `
      <div>
        <div class="agenda-card-header">
          <h4 class="agenda-card-title">${escapeHtml(tarea.titulo)}</h4>
          ${estadoPills[tarea.estado] || ''}
        </div>
        <div class="agenda-card-meta">
          <span><i class="fa-regular fa-calendar" style="color: #38bdf8; margin-right: 4px;"></i> ${fechaFormateada}</span>
          ${tarea.hora ? `<span><i class="fa-regular fa-clock" style="color: #fbbf24; margin-right: 4px;"></i> ${escapeHtml(tarea.hora)} (${minAntesText})</span>` : '<span><i class="fa-regular fa-clock" style="color: #fbbf24; margin-right: 4px;"></i> Sin hora</span>'}
          ${tarea.lugar ? `<span><i class="fa-solid fa-building" style="color: #a5b4fc; margin-right: 4px;"></i> ${escapeHtml(tarea.lugar)}</span>` : ''}
          ${tarea.horas_estimadas ? `<span><i class="fa-solid fa-stopwatch" style="color: #34d399; margin-right: 4px;"></i> ${Number(tarea.horas_estimadas).toFixed(1)} h est.</span>` : ''}
        </div>
        ${tarea.descripcion ? `<div class="agenda-card-desc"><i class="fa-solid fa-list-check" style="color: #818cf8; margin-right: 6px;"></i> ${escapeHtml(tarea.descripcion)}</div>` : ''}
      </div>
      <div class="agenda-card-actions">
        ${tarea.estado !== 'completada' ? `
          <button type="button" class="btn-convert-log" onclick="convertirTareaARegistro(${tarea.id})" title="Registrar automáticamente las horas trabajadas en esta tarea">
            <i class="fa-solid fa-bolt"></i> Cargar a Mis Horas
          </button>
        ` : `
          <span style="font-size: 12px; color: #34d399; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Tarea Finalizada</span>
        `}
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn btn-outline btn-sm" onclick="openAgendaModal(${tarea.id})" title="Editar tarea">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteAgendaTarea(${tarea.id})" title="Eliminar tarea">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function openAgendaModal(tareaId = null) {
  const modal = document.getElementById('modal-agenda');
  const modalTitle = document.getElementById('modal-agenda-title');
  const inputId = document.getElementById('agenda-id');
  const inputTitulo = document.getElementById('agenda-titulo');
  const inputFecha = document.getElementById('agenda-fecha');
  const inputHora = document.getElementById('agenda-hora');
  const inputMin = document.getElementById('agenda-minutos-recordatorio');
  const inputEstado = document.getElementById('agenda-estado');
  const inputLugar = document.getElementById('agenda-lugar');
  const inputHoras = document.getElementById('agenda-horas-estimadas');
  const inputDesc = document.getElementById('agenda-descripcion');

  if (!modal) return;

  if (tareaId) {
    const t = currentAgendaTasks.find(x => x.id === tareaId);
    if (t) {
      modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: #10b981;"></i> Editar Tarea Agendada';
      inputId.value = t.id;
      inputTitulo.value = t.titulo || '';
      inputFecha.value = t.fecha || new Date().toISOString().split('T')[0];
      inputHora.value = t.hora || '09:00';
      inputMin.value = t.minutos_recordatorio ?? 10;
      inputEstado.value = t.estado || 'pendiente';
      inputLugar.value = t.lugar || '';
      inputHoras.value = t.horas_estimadas || 1.0;
      inputDesc.value = t.descripcion || '';
    }
  } else {
    modalTitle.innerHTML = '<i class="fa-solid fa-calendar-plus" style="color: #10b981;"></i> Agendar Nueva Tarea';
    inputId.value = '';
    inputTitulo.value = '';
    const hoyStr = new Date().toISOString().split('T')[0];
    inputFecha.value = hoyStr;
    inputHora.value = '09:00';
    inputMin.value = '10';
    inputEstado.value = 'pendiente';
    inputLugar.value = '';
    inputHoras.value = '1.0';
    inputDesc.value = '';
  }

  modal.classList.add('active');
}

function closeAgendaModal() {
  const modal = document.getElementById('modal-agenda');
  if (modal) modal.classList.remove('active');
}

async function saveAgendaTarea() {
  const tareaId = document.getElementById('agenda-id').value;
  const payload = {
    titulo: document.getElementById('agenda-titulo').value.trim(),
    fecha: document.getElementById('agenda-fecha').value,
    hora: document.getElementById('agenda-hora').value,
    minutos_recordatorio: Number(document.getElementById('agenda-minutos-recordatorio').value),
    estado: document.getElementById('agenda-estado').value,
    lugar: document.getElementById('agenda-lugar').value.trim(),
    horas_estimadas: Number(document.getElementById('agenda-horas-estimadas').value || 1.0),
    descripcion: document.getElementById('agenda-descripcion').value.trim()
  };

  if (!payload.titulo) {
    showToast("Por favor ingresa un título para la tarea.", "error");
    return;
  }

  try {
    const url = tareaId ? `/api/agenda/${tareaId}` : '/api/agenda';
    const method = tareaId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.status === 'success') {
      showToast(result.message || "Tarea agendada con éxito", "success");
      closeAgendaModal();
      loadAgendaView();
    } else {
      showToast(result.message || "Error al guardar tarea", "error");
    }
  } catch (err) {
    showToast("Error al conectar para guardar tarea", "error");
  }
}

async function saveAgendaTareaFromMain() {
  const payload = {
    titulo: document.getElementById('agenda-titulo-main').value.trim(),
    fecha: document.getElementById('agenda-fecha-main').value,
    hora: document.getElementById('agenda-hora-main').value,
    minutos_recordatorio: Number(document.getElementById('agenda-min-main').value),
    estado: document.getElementById('agenda-estado-main').value,
    lugar: document.getElementById('agenda-lugar-main').value.trim(),
    horas_estimadas: Number(document.getElementById('agenda-horas-main').value || 1.0),
    descripcion: document.getElementById('agenda-desc-main').value.trim()
  };

  if (!payload.titulo) {
    showToast("Por favor ingresa un título para la tarea.", "error");
    return;
  }

  try {
    const res = await fetch('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.status === 'success') {
      showToast("Tarea guardada en el Planner", "success");
      // Limpiar formulario main
      document.getElementById('agenda-titulo-main').value = '';
      document.getElementById('agenda-desc-main').value = '';
      loadAgendaView();
    } else {
      showToast(result.message || "Error al guardar tarea", "error");
    }
  } catch (err) {
    showToast("Error al conectar para guardar tarea", "error");
  }
}

function toggleTipoIngreso() {
  const tipo = document.querySelector('input[name="tipo_ingreso"]:checked').value;
  if (tipo === 'registro') {
    document.getElementById('contenedor-registro').style.display = 'block';
    document.getElementById('contenedor-agenda-main').style.display = 'none';
  } else {
    document.getElementById('contenedor-registro').style.display = 'none';
    document.getElementById('contenedor-agenda-main').style.display = 'block';
    
    // Auto fill date if empty
    const fechaInput = document.getElementById('agenda-fecha-main');
    if (!fechaInput.value) {
      fechaInput.value = new Date().toISOString().split('T')[0];
    }
  }
}

async function cycleTareaEstado(tareaId, estadoActual) {
  const siguienteEstadoMap = {
    'pendiente': 'en_progreso',
    'en_progreso': 'completada',
    'completada': 'pendiente'
  };

  const nuevoEstado = siguienteEstadoMap[estadoActual] || 'pendiente';

  try {
    const res = await fetch(`/api/agenda/${tareaId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    const result = await res.json();
    if (result.status === 'success') {
      showToast(`Estado cambiado a: ${nuevoEstado.toUpperCase().replace('_', ' ')}`, "info");
      loadAgendaView();
    }
  } catch (err) {
    showToast("Error cambiando estado de la tarea", "error");
  }
}

async function deleteAgendaTarea(tareaId) {
  if (!confirm("¿Estás seguro de eliminar esta tarea de la agenda?")) return;

  try {
    const res = await fetch(`/api/agenda/${tareaId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.status === 'success') {
      showToast("Tarea eliminada de la agenda", "success");
      loadAgendaView();
    }
  } catch (err) {
    showToast("Error al eliminar tarea", "error");
  }
}

function closeConvertirModal() {
  const modal = document.getElementById('modal-convertir');
  if (modal) modal.classList.remove('active');
}

async function convertirTareaARegistro(tareaId) {
  const t = currentAgendaTasks.find(x => x.id === tareaId);
  if (!t) return;
  
  document.getElementById('convertir-id').value = t.id;
  document.getElementById('convertir-fecha').value = t.fecha || new Date().toISOString().split('T')[0];
  document.getElementById('convertir-horas').value = t.horas_estimadas || 1.0;
  document.getElementById('convertir-lugar').value = t.lugar || '';
  document.getElementById('convertir-actividad').value = t.titulo || '';
  document.getElementById('convertir-comentario').value = t.descripcion || '';
  
  const modal = document.getElementById('modal-convertir');
  if (modal) modal.classList.add('active');
}

async function submitConvertirTarea() {
  const tareaId = document.getElementById('convertir-id').value;
  const payload = {
    fecha: document.getElementById('convertir-fecha').value,
    horas: document.getElementById('convertir-horas').value,
    lugar: document.getElementById('convertir-lugar').value,
    actividad: document.getElementById('convertir-actividad').value,
    comentario: document.getElementById('convertir-comentario').value
  };

  try {
    const res = await fetch(`/api/agenda/${tareaId}/convertir_a_registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.status === 'success') {
      showToast("⚡ ¡Tarea completada y cargada exitosamente a tu registro de horas!", "success");
      closeConvertirModal();
      loadAgendaView();
      loadDashboard();
      loadRegistros();
    } else {
      showToast(result.message || "Error al registrar la tarea", "error");
    }
  } catch (err) {
    showToast("Error al procesar la conversión de tarea", "error");
  }
}



