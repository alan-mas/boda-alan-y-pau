(function () {
  'use strict';

  // Mismo endpoint de Apps Script que usa rsvp.js y regalos.js
  var API_URL = 'https://script.google.com/macros/s/AKfycbxr8CjybMSTM_ppJaHLtn5r4P1qLd7mz6bO5Sn7YsU4Qfdh7dMGIxG6n5nOb8CNnbLD/exec';
  var CLAVE_PASSWORD_LOCAL = 'panel_password';

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('panel-login')) return;

    var passwordGuardada = localStorage.getItem(CLAVE_PASSWORD_LOCAL);
    if (passwordGuardada) {
      intentarEntrar(passwordGuardada, true);
    }

    document.getElementById('panel-login-btn').addEventListener('click', function () {
      var password = document.getElementById('panel-password').value.trim();
      if (!password) return;
      intentarEntrar(password, false);
    });

    document.getElementById('panel-password').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('panel-login-btn').click();
    });

    document.getElementById('panel-logout-btn').addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem(CLAVE_PASSWORD_LOCAL);
      window.location.reload();
    });
  });

  function intentarEntrar(password, silencioso) {
    var boton = document.getElementById('panel-login-btn');
    if (!silencioso) {
      boton.disabled = true;
      boton.textContent = 'Entrando...';
    }

    fetch(API_URL + '?accion=estadisticas&password=' + encodeURIComponent(password) + '&t=' + Date.now())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) {
          if (!silencioso) mostrarErrorLogin(data.message || 'Contraseña incorrecta.');
          return;
        }
        localStorage.setItem(CLAVE_PASSWORD_LOCAL, password);
        mostrarPanel(data);
      })
      .catch(function () {
        if (!silencioso) mostrarErrorLogin('Error de conexión. Intenta de nuevo.');
      })
      .finally(function () {
        if (!silencioso) {
          boton.disabled = false;
          boton.textContent = 'Entrar';
        }
      });
  }

  function mostrarErrorLogin(mensaje) {
    document.getElementById('panel-login-alert').innerHTML =
      '<p style="color:#c0392b; font-size:13px;">' + escaparHtml(mensaje) + '</p>';
  }

  var listaRegalos = [], filtroRegalos = 'todos';
  var listaInvitados = [], filtroInvitados = 'todos', busquedaInvitado = '';

  function mostrarPanel(data) {
    document.getElementById('panel-login').style.display = 'none';
    document.getElementById('panel-contenido').style.display = '';

    var rsvp = data.rsvp || {};
    var regalos = data.regalos || {};

    renderizarTarjetas(rsvp, regalos);
    renderizarProgreso(regalos);
    listaRegalos = regalos.lista || [];
    renderizarTablaRegalos();
    document.getElementById('panel-filtro-regalos').addEventListener('click', function (e) {
      var pill = e.target.closest('.regalo-filtro-pill');
      if (!pill) return;
      filtroRegalos = pill.getAttribute('data-f');
      this.querySelectorAll('.regalo-filtro-pill').forEach(function (p) { p.classList.toggle('activo', p === pill); });
      renderizarTablaRegalos();
    });
    listaInvitados = (rsvp.invitados || []).map(function (i) {
      i.clave = normalizar(i.n + ' ' + i.f + ' ' + i.c); return i;
    });
    renderizarInvitados();
    document.getElementById('panel-buscar-invitado').addEventListener('input', function () {
      busquedaInvitado = normalizar(this.value); renderizarInvitados();
    });
    document.getElementById('panel-filtro-invitados').addEventListener('click', function (e) {
      var pill = e.target.closest('.regalo-filtro-pill');
      if (!pill) return;
      filtroInvitados = pill.getAttribute('data-f');
      this.querySelectorAll('.regalo-filtro-pill').forEach(function (p) { p.classList.toggle('activo', p === pill); });
      renderizarInvitados();
    });
    renderizarListaRSVP(rsvp.ultimasConfirmaciones || []);
    renderizarListaRegalos(regalos.ultimosPagos || []);
  }

  function tarjetasHtml(tarjetas) {
    return tarjetas.map(function (t) {
      return (
        '<div class="col-md-2 col-sm-4 col-xs-6">' +
          '<div class="panel-card">' +
            '<div class="panel-card-icon" style="background:' + t.color + '22; color:' + t.color + ';">' +
              '<i class="fa ' + t.icono + '"></i>' +
            '</div>' +
            '<div class="panel-card-value">' + escaparHtml(t.valor) + '</div>' +
            '<div class="panel-card-label">' + escaparHtml(t.etiqueta) + '</div>' +
            (t.detalle ? '<div class="panel-card-detalle">' + escaparHtml(t.detalle) + '</div>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderizarTarjetas(rsvp, regalos) {
    var n = function (x) { return Number(x) || 0; };
    document.getElementById('panel-cards').innerHTML = tarjetasHtml([
      { icono: 'fa-users', color: '#e8ca6f', valor: String(n(rsvp.personas)), etiqueta: 'Invitados',
        detalle: '+ ' + n(rsvp.masUno) + ' con +1 · ' + n(rsvp.grupos) + ' grupos' },
      { icono: 'fa-envelope-open-o', color: '#3d4351', valor: n(rsvp.gruposRespondidos) + '/' + n(rsvp.grupos), etiqueta: 'Grupos que respondieron',
        detalle: n(rsvp.personasRespondieron) + ' personas' },
      { icono: 'fa-check-circle', color: '#2ea043', valor: String(n(rsvp.boda) + n(rsvp.masUnoBoda)), etiqueta: 'Van a la boda',
        detalle: n(rsvp.masUnoBoda) ? 'incluye ' + n(rsvp.masUnoBoda) + ' +1' : '' },
      { icono: 'fa-glass', color: '#2ea043', valor: String(n(rsvp.tornaboda) + n(rsvp.masUnoTornaboda)), etiqueta: 'Van a la tornaboda',
        detalle: n(rsvp.masUnoTornaboda) ? 'incluye ' + n(rsvp.masUnoTornaboda) + ' +1' : '' },
      { icono: 'fa-times-circle', color: '#c0392b', valor: String(n(rsvp.noAsisten)), etiqueta: 'No asistirán' },
      { icono: 'fa-clock-o', color: '#e0577b', valor: String(n(rsvp.personasPendientes)), etiqueta: 'Por responder',
        detalle: n(rsvp.masUnoPendientes) ? '+ ' + n(rsvp.masUnoPendientes) + ' posibles +1' : '' }
    ]);

    var faltan = n(regalos.total) - n(regalos.comprados);
    document.getElementById('panel-cards-regalos').innerHTML = tarjetasHtml([
      { icono: 'fa-gift', color: '#e8ca6f', valor: String(n(regalos.total)), etiqueta: 'Regalos en la mesa' },
      { icono: 'fa-check', color: '#2ea043', valor: String(n(regalos.comprados)), etiqueta: 'Completos' },
      { icono: 'fa-hourglass-half', color: '#e0577b', valor: String(faltan), etiqueta: 'Faltan' },
      { icono: 'fa-heart', color: '#e0577b', valor: String(n(regalos.aportaciones)), etiqueta: 'Aportaciones' },
      { icono: 'fa-usd', color: '#2ea043', valor: '$' + formatearMonto(regalos.recaudado, true), etiqueta: 'Recaudado' },
      { icono: 'fa-flag-checkered', color: '#3d4351', valor: '$' + formatearMonto(Math.max(0, n(regalos.meta) - n(regalos.recaudado)), true), etiqueta: 'Falta para la meta' }
    ]);
  }

  function normalizar(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function renderizarInvitados() {
    var filas = listaInvitados.filter(function (i) {
      if (busquedaInvitado && i.clave.indexOf(busquedaInvitado) === -1) return false;
      if (filtroInvitados === 'pendientes') return !i.r;
      if (filtroInvitados === 'si') return i.r && i.b;
      if (filtroInvitados === 'no') return i.r && !i.b;
      return true;
    });
    var marca = function (resp, si, masUno, siMasUno) {
      if (!resp) return '<span class="panel-estado pendiente">⏳ Pendiente</span>';
      return (si ? '<span class="panel-estado si">✅ Sí</span>' : '<span class="panel-estado no">❌ No</span>') +
        (masUno ? ' <small>+1: ' + (siMasUno ? 'sí' : 'no') + '</small>' : '');
    };
    document.getElementById('panel-tabla-invitados').innerHTML = filas.length ? filas.map(function (i) {
      return '<tr><td><strong>' + escaparHtml(i.n) + '</strong>' + (i.m ? ' <small>(+1)</small>' : '') + '</td>' +
        '<td>' + escaparHtml(i.f) + '</td><td><code>' + escaparHtml(i.c) + '</code></td>' +
        '<td>' + marca(i.r, i.b, i.m, i.mb) + '</td><td>' + marca(i.r, i.t, i.m, i.mt) + '</td>' +
        '<td>' + (i.r ? formatearFecha(i.fe) : '—') + '</td></tr>';
    }).join('') : '<tr><td colspan="6" class="panel-activity-empty">No encontramos a nadie con esa búsqueda.</td></tr>';
    document.getElementById('panel-invitados-conteo').textContent = filas.length + ' de ' + listaInvitados.length + ' invitados';
  }

  function renderizarTablaRegalos() {
    var filas = listaRegalos.filter(function (r) {
      return filtroRegalos === 'todos' || (filtroRegalos === 'completos' ? r.completo : !r.completo);
    }).sort(function (a, b) {
      var pa = a.meta ? a.recaudado / a.meta : 0, pb = b.meta ? b.recaudado / b.meta : 0;
      return pb - pa;
    });
    var tbody = document.getElementById('panel-tabla-regalos');
    if (!filas.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="panel-activity-empty">Nada por aquí todavía.</td></tr>';
      return;
    }
    tbody.innerHTML = filas.map(function (r) {
      var pct = r.meta ? Math.min(100, Math.round(r.recaudado / r.meta * 100)) : 0;
      var falta = Math.max(0, r.meta - r.recaudado);
      return (
        '<tr' + (r.completo ? ' class="completo"' : '') + '>' +
          '<td><strong>' + escaparHtml(r.nombre) + '</strong>' +
            (r.categoria ? ' <span class="panel-tabla-cat">' + escaparHtml(r.categoria) + '</span>' : '') +
            '<div class="regalo-progress-track panel-tabla-barra"><div class="regalo-progress-fill" style="width:' + pct + '%;"></div></div>' +
            (r.quienes && r.quienes.length ? '<div class="panel-tabla-quienes">De: ' + escaparHtml(r.quienes.join(', ')) + '</div>' : '') +
          '</td>' +
          '<td>$' + formatearMonto(r.recaudado, true) + ' <small>(' + pct + '%)</small></td>' +
          '<td>$' + formatearMonto(r.meta, true) + '</td>' +
          '<td>' + (r.completo ? '✅ Completo' : '$' + formatearMonto(falta, true)) + '</td>' +
          '<td class="text-center">' + (r.aportaciones || 0) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderizarProgreso(regalos) {
    var meta = Number(regalos.meta) || 0;
    var recaudado = Number(regalos.recaudado) || 0;
    var porcentaje = meta > 0 ? Math.min(100, Math.round((recaudado / meta) * 100)) : 0;

    document.getElementById('panel-progreso-fill').style.width = porcentaje + '%';
    document.getElementById('panel-progreso-texto').textContent =
      '$' + formatearMonto(recaudado) + ' de $' + formatearMonto(meta) + ' (' + porcentaje + '%)';
  }

  function renderizarListaRSVP(items) {
    var contenedor = document.getElementById('panel-lista-rsvp');
    if (!items.length) {
      contenedor.innerHTML = '<li class="panel-activity-empty">Todavía no hay confirmaciones.</li>';
      return;
    }
    contenedor.innerHTML = items.map(function (item) {
      return (
        '<li class="panel-activity-item">' +
          '<i class="fa ' + (item.boda ? 'fa-check-circle' : 'fa-times-circle') + '"></i> ' +
          '<span>' + escaparHtml(item.nombre) + ' <small>' +
            (item.boda ? (item.tornaboda ? 'boda + tornaboda' : 'solo boda') : 'no asistirá') + '</small></span>' +
          '<span class="panel-activity-fecha">' + formatearFecha(item.fecha) + '</span>' +
        '</li>'
      );
    }).join('');
  }

  function renderizarListaRegalos(items) {
    var contenedor = document.getElementById('panel-lista-regalos');
    if (!items.length) {
      contenedor.innerHTML = '<li class="panel-activity-empty">Todavía no han recibido regalos.</li>';
      return;
    }
    contenedor.innerHTML = items.map(function (item) {
      return (
        '<li class="panel-activity-item">' +
          '<i class="fa fa-gift"></i> ' +
          '<span>' + escaparHtml(item.nombre) + ' — $' + formatearMonto(item.monto) +
            (item.regalo ? ' <small>· ' + escaparHtml(item.regalo) + '</small>' : '') + '</span>' +
          '<span class="panel-activity-fecha">' + formatearFecha(item.fecha) + '</span>' +
        '</li>' +
        (item.nota ? '<li class="panel-activity-nota">“' + escaparHtml(item.nota) + '”</li>' : '')
      );
    }).join('');
  }

  function formatearMonto(num, sinCentavos) {
    var d = sinCentavos ? 0 : 2;
    return Number(num || 0).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function formatearFecha(iso) {
    if (!iso) return '';
    var fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  function escaparHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
