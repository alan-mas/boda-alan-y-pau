(function () {
  'use strict';

  // ──────────────────────────────────────────────────────────
  //  CAMBIA ESTA URL por la de tu Google Apps Script desplegado
  //  (la obtienes al hacer "Deploy > New deployment" en Apps Script)
  // ──────────────────────────────────────────────────────────
  var RSVP_URL = 'https://script.google.com/macros/s/AKfycbxr8CjybMSTM_ppJaHLtn5r4P1qLd7mz6bO5Sn7YsU4Qfdh7dMGIxG6n5nOb8CNnbLD/exec';

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('rsvp-form');
    if (!form) return;

    // Fase de captura (true) para ejecutarse antes de cualquier otro handler
    // y evitar conflictos con scripts previos
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      var nombre       = (form.querySelector('[name="name"]')        || {}).value || '';
      var correo       = (form.querySelector('[name="email"]')       || {}).value || '';
      var codigo       = (form.querySelector('[name="invite_code"]') || {}).value || '';
      var alertBox     = document.getElementById('alert-wrapper');
      var btn          = form.querySelector('.rsvp-btn');

      nombre  = nombre.trim();
      correo  = correo.trim();
      codigo  = codigo.trim().toUpperCase();

      limpiarAlerta(alertBox);

      if (!nombre || !correo || !codigo) {
        mostrarAlerta(alertBox, false, 'Por favor completa todos los campos requeridos.');
        return;
      }

      if (!esCorreoValido(correo)) {
        mostrarAlerta(alertBox, false, 'El correo electrónico no es válido.');
        return;
      }

      var textoOriginal = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Enviando&hellip;';

      var payload = {
        nombre: nombre,
        correo: correo,
        codigo: codigo
      };

      fetch(RSVP_URL, {
        method:  'POST',
        // text/plain evita el preflight de CORS — Apps Script lo acepta igualmente
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          btn.disabled = false;
          btn.innerHTML = textoOriginal;

          if (data.success) {
            form.reset();
            // Bootstrap modal de éxito ya definido en index.html
            if (typeof $ !== 'undefined') {
              $('#rsvp-modal').modal('show');
            }
          } else {
            mostrarAlerta(alertBox, false, data.message || 'Ocurrió un error. Intenta de nuevo.');
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.innerHTML = textoOriginal;
          mostrarAlerta(alertBox, false, 'Error de conexión. Verifica tu internet e intenta de nuevo.');
        });

    }, true); // ← captura (true) = corre antes de otros listeners del mismo elemento
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
      escaparHtml(mensaje) +
      '</div>';
  }

  function esCorreoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  function escaparHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
