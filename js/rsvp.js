(function () {
  'use strict';

  // RSVP por grupo familiar: 1) el invitado escribe su código, 2) marca quién
  // de su grupo va a la boda / tornaboda (y su +1 si lo tiene), 3) revisa el
  // resumen y envía. Los que no se marcan quedan registrados como "no asiste".
  var RSVP_URL = 'https://script.google.com/macros/s/AKfycbxr8CjybMSTM_ppJaHLtn5r4P1qLd7mz6bO5Sn7YsU4Qfdh7dMGIxG6n5nOb8CNnbLD/exec';

  function t(s) { return window.i18nT ? window.i18nT(s) : s; }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('rsvp-form');
    if (!form) return;

    var inputCodigo = form.querySelector('[name="invite_code"]');
    var pasoCodigo  = document.getElementById('rsvp-paso-codigo');
    var panelGrupo  = document.getElementById('rsvp-grupo');
    var lista       = document.getElementById('rsvp-integrantes');
    var resumen     = document.getElementById('rsvp-resumen');
    var alertBox    = document.getElementById('alert-wrapper');
    var btn         = document.getElementById('rsvp-btn-principal');
    var btnVolver   = document.getElementById('rsvp-btn-volver');

    var paso = 'codigo', codigo = '', integrantes = [];

    function mostrarPaso(nuevo) {
      paso = nuevo;
      pasoCodigo.hidden = paso !== 'codigo';
      panelGrupo.hidden = paso !== 'grupo';
      resumen.hidden    = paso !== 'resumen';
      btnVolver.hidden  = paso === 'codigo';
      btn.textContent = t(paso === 'codigo' ? 'Buscar mi invitación'
        : paso === 'grupo' ? 'Continuar' : 'Sí, enviar mi confirmación');
      limpiarAlerta(alertBox);
    }

    function casilla(clase, i, texto) {
      return '<label class="rsvp-evento-check"><input type="checkbox" class="' + clase + '" data-i="' + i + '">' +
        '<span>' + texto + '</span></label>';
    }

    function pintarIntegrantes() {
      var boda = t('Boda') + ' <em>(27 feb)</em>', torna = t('Tornaboda') + ' <em>(28 feb)</em>';
      lista.innerHTML = integrantes.map(function (p, i) {
        var html = '<div class="rsvp-persona"><p class="rsvp-persona-nombre">' + escaparHtml(p.nombre) + '</p>' +
          '<div class="rsvp-persona-eventos">' + casilla('chk-boda', i, boda) + casilla('chk-torna', i, torna) + '</div></div>';
        if (p.masUno) {
          html += '<div class="rsvp-persona rsvp-persona-masuno"><p class="rsvp-persona-nombre">+1 · ' +
            t('Acompañante de') + ' ' + escaparHtml(p.nombre) + '</p>' +
            '<p class="rsvp-persona-nota">' + t('Tienes acceso a un +1. ¿Lo usarás?') + '</p>' +
            '<div class="rsvp-persona-eventos">' + casilla('chk-mu-boda', i, boda) + casilla('chk-mu-torna', i, torna) + '</div></div>';
        }
        return html;
      }).join('');
      actualizarBloqueos();
    }

    function chk(clase, i) { return lista.querySelector('.' + clase + '[data-i="' + i + '"]'); }

    // Tornaboda requiere boda; el +1 requiere que su anfitrión vaya a la boda.
    function actualizarBloqueos() {
      integrantes.forEach(function (p, i) {
        var b = chk('chk-boda', i), tb = chk('chk-torna', i);
        bloquear(tb, !b.checked);
        if (p.masUno) {
          var mb = chk('chk-mu-boda', i), mt = chk('chk-mu-torna', i);
          bloquear(mb, !b.checked);
          bloquear(mt, !mb.checked || !tb.checked);
        }
      });
    }

    function bloquear(input, si) {
      if (si) input.checked = false;
      input.disabled = si;
    }

    lista.addEventListener('change', actualizarBloqueos);

    function respuestas() {
      return integrantes.map(function (p, i) {
        return {
          boda: chk('chk-boda', i).checked,
          tornaboda: chk('chk-torna', i).checked,
          masUnoBoda: p.masUno ? chk('chk-mu-boda', i).checked : false,
          masUnoTornaboda: p.masUno ? chk('chk-mu-torna', i).checked : false
        };
      });
    }

    function pintarResumen() {
      var r = respuestas(), posibles = 0, boda = [], torna = [];
      integrantes.forEach(function (p, i) {
        posibles += p.masUno ? 2 : 1;
        if (r[i].boda) boda.push(p.nombre);
        if (r[i].tornaboda) torna.push(p.nombre);
        if (r[i].masUnoBoda) boda.push('+1 · ' + p.nombre);
        if (r[i].masUnoTornaboda) torna.push('+1 · ' + p.nombre);
      });
      var lis = function (arr) {
        return arr.length ? '<ul>' + arr.map(function (n) { return '<li>' + escaparHtml(n) + '</li>'; }).join('') + '</ul>' : '';
      };
      resumen.innerHTML = boda.length
        ? '<p>' + t('Confirmaste') + ' <strong>' + boda.length + ' ' + t('de') + ' ' + posibles + '</strong> ' +
          t('lugares posibles para la boda') + ':</p>' + lis(boda) +
          '<p>' + t('Tornaboda') + ': <strong>' + torna.length + ' ' + t('de') + ' ' + posibles + '</strong></p>' + lis(torna) +
          '<p class="rsvp-resumen-pregunta">' + t('¿Estás listo para enviar tu confirmación?') + '</p>'
        : '<p>' + t('No marcaste a nadie: registraremos que nadie de tu invitación podrá asistir.') + '</p>' +
          '<p class="rsvp-resumen-pregunta">' + t('¿Estás seguro de enviar tu respuesta?') + '</p>';
    }

    btnVolver.addEventListener('click', function () {
      mostrarPaso(paso === 'resumen' ? 'grupo' : 'codigo');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      limpiarAlerta(alertBox);

      if (paso === 'codigo') {
        var c = (inputCodigo.value || '').trim().toUpperCase();
        if (!c) { mostrarAlerta(alertBox, false, 'Escribe tu código de reservación.'); return; }
        enviar({ accion: 'buscarCodigo', codigo: c }, function (data) {
          codigo = c;
          integrantes = data.integrantes || [];
          pintarIntegrantes();
          mostrarPaso('grupo');
        });
      } else if (paso === 'grupo') {
        pintarResumen();
        mostrarPaso('resumen');
      } else {
        enviar({ codigo: codigo, respuestas: respuestas() }, function (data) {
          form.reset();
          integrantes = []; codigo = '';
          mostrarPaso('codigo');
          var msg = document.getElementById('rsvp-modal-msg');
          if (msg && data.message) msg.textContent = t(data.message);
          if (typeof $ !== 'undefined') $('#rsvp-modal').modal('show');
        });
      }
    }, true);

    function enviar(payload, alExito) {
      var texto = btn.textContent;
      btn.disabled = true;
      btn.textContent = t('Enviando…');
      fetch(RSVP_URL, {
        method: 'POST',
        // text/plain evita el preflight de CORS — Apps Script lo acepta igualmente
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          btn.disabled = false;
          btn.textContent = texto;
          if (data.success) alExito(data);
          else mostrarAlerta(alertBox, false, data.message || 'Ocurrió un error. Intenta de nuevo.');
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = texto;
          mostrarAlerta(alertBox, false, 'Error de conexión. Verifica tu internet e intenta de nuevo.');
        });
    }

    mostrarPaso('codigo');
  });

  // ── helpers ─────────────────────────────────────────────────
  function limpiarAlerta(wrapper) {
    if (wrapper) wrapper.innerHTML = '';
  }

  function mostrarAlerta(wrapper, exito, mensaje) {
    if (!wrapper) return;
    var clase = exito ? 'alert-success' : 'alert-danger';
    wrapper.innerHTML =
      '<div class="alert ' + clase + '" style="margin-top:12px;border-radius:4px;padding:10px 15px;">' +
      escaparHtml(window.i18nT ? window.i18nT(mensaje) : mensaje) +
      '</div>';
  }

  function escaparHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
