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

    fetch(API_URL + '?accion=estadisticas&password=' + encodeURIComponent(password))
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

  function mostrarPanel(data) {
    document.getElementById('panel-login').style.display = 'none';
    document.getElementById('panel-contenido').style.display = '';

    var rsvp = data.rsvp || {};
    var regalos = data.regalos || {};

    renderizarTarjetas(rsvp, regalos);
    renderizarProgreso(regalos);
    renderizarListaRSVP(rsvp.ultimasConfirmaciones || []);
    renderizarListaRegalos(regalos.ultimosPagos || []);
  }

  function renderizarTarjetas(rsvp, regalos) {
    var tarjetas = [
      { icono: 'fa-calendar', color: '#e8ca6f', valor: '2', etiqueta: 'Eventos' },
      { icono: 'fa-check-circle', color: '#2ea043', valor: String(rsvp.confirmados || 0), etiqueta: 'Confirmados' },
      { icono: 'fa-clock-o', color: '#e0577b', valor: String(rsvp.pendientes || 0), etiqueta: 'Por confirmar' },
      { icono: 'fa-gift', color: '#e8ca6f', valor: String(regalos.total || 0), etiqueta: 'Regalos' },
      { icono: 'fa-line-chart', color: '#2ea043', valor: (regalos.comprados || 0) + '/' + (regalos.total || 0), etiqueta: 'Comprados' },
      { icono: 'fa-usd', color: '#3d4351', valor: formatearMonto(regalos.recaudado), etiqueta: 'Recaudado' }
    ];

    document.getElementById('panel-cards').innerHTML = tarjetas.map(function (t) {
      return (
        '<div class="col-md-2 col-sm-4 col-xs-6">' +
          '<div class="panel-card">' +
            '<div class="panel-card-icon" style="background:' + t.color + '22; color:' + t.color + ';">' +
              '<i class="fa ' + t.icono + '"></i>' +
            '</div>' +
            '<div class="panel-card-value">' + escaparHtml(t.valor) + '</div>' +
            '<div class="panel-card-label">' + escaparHtml(t.etiqueta) + '</div>' +
          '</div>' +
        '</div>'
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
          '<i class="fa fa-check-circle"></i> ' +
          '<span>' + escaparHtml(item.nombre) + '</span>' +
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
          '<span>' + escaparHtml(item.nombre) + ' — $' + formatearMonto(item.monto) + '</span>' +
          '<span class="panel-activity-fecha">' + formatearFecha(item.fecha) + '</span>' +
        '</li>' +
        (item.nota ? '<li class="panel-activity-nota">“' + escaparHtml(item.nota) + '”</li>' : '')
      );
    }).join('');
  }

  function formatearMonto(num) {
    return Number(num || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
