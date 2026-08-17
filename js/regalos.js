(function () {
  'use strict';

  // Mismo endpoint de Apps Script que usa rsvp.js
  var API_URL = 'https://script.google.com/macros/s/AKfycbxr8CjybMSTM_ppJaHLtn5r4P1qLd7mz6bO5Sn7YsU4Qfdh7dMGIxG6n5nOb8CNnbLD/exec';

  var MONTOS_SUGERIDOS = [500, 1000, 2000];
  var MONTO_MINIMO = 50;

  var filtroActivo = 'todos';
  var carrito = []; // [{ id, nombre, tipo, monto, foto }]

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('regalos-grid')) return;

    cargarCarritoLocal();
    mostrarEstadoDesdeURL();
    cargarRegalos();
    actualizarBotonFlotante();

    var whatsappBtn = document.getElementById('whatsapp-share-btn');
    if (whatsappBtn) {
      var mensaje = 'Aquí está nuestra mesa de regalos 🎁 ' + window.location.href;
      whatsappBtn.href = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
    }

    // ── clics dentro de las tarjetas de regalo ──
    document.getElementById('regalos-grid').addEventListener('click', function (e) {
      var pillMonto = e.target.closest ? e.target.closest('.regalo-monto-opcion') : null;
      if (pillMonto) {
        var card = pillMonto.closest('.regalo-card');
        card.querySelectorAll('.regalo-monto-opcion').forEach(function (o) { o.classList.remove('activo'); });
        pillMonto.classList.add('activo');
        var customInput = card.querySelector('.regalo-monto-custom');
        if (customInput) customInput.value = '';
        card.querySelector('.regalo-btn').setAttribute('data-monto', pillMonto.getAttribute('data-monto'));
        return;
      }

      var btn = e.target.closest ? e.target.closest('.regalo-btn') : null;
      if (btn && !btn.disabled) {
        agregarAlCarritoDesdeTarjeta(btn);
        return;
      }
    });

    document.getElementById('regalos-grid').addEventListener('input', function (e) {
      if (!e.target.classList.contains('regalo-monto-custom')) return;
      var card = e.target.closest('.regalo-card');
      card.querySelectorAll('.regalo-monto-opcion').forEach(function (o) { o.classList.remove('activo'); });
      var monto = Number(e.target.value) || 0;
      card.querySelector('.regalo-btn').setAttribute('data-monto', monto);
    });

    // ── filtros por categoría ──
    var filtrosWrap = document.getElementById('regalos-filtros');
    if (filtrosWrap) {
      filtrosWrap.addEventListener('click', function (e) {
        var pill = e.target.closest ? e.target.closest('.regalo-filtro-pill') : null;
        if (!pill) return;
        filtroActivo = pill.getAttribute('data-filtro');
        actualizarPillsActivas();
        renderizarGrid();
      });
    }

    // ── carrito flotante y modal ──
    var flotante = document.getElementById('carrito-flotante');
    if (flotante) {
      flotante.addEventListener('click', function () {
        renderizarCarritoModal();
        mostrarEstadoCarrito('lista');
        if (typeof $ !== 'undefined') { $('#carrito-modal').modal('show'); }
      });
    }

    var itemsWrap = document.getElementById('carrito-items');
    if (itemsWrap) {
      itemsWrap.addEventListener('click', function (e) {
        var quitar = e.target.closest ? e.target.closest('.carrito-item-quitar') : null;
        if (!quitar) return;
        quitarDelCarrito(quitar.getAttribute('data-id'));
        renderizarCarritoModal();
      });
    }

    var continuarCarritoBtn = document.getElementById('carrito-continuar-btn');
    if (continuarCarritoBtn) {
      continuarCarritoBtn.addEventListener('click', function () {
        document.getElementById('carrito-pagar-total').textContent = '$' + formatoMoneda(totalCarrito()) + ' MXN';
        mostrarEstadoCarrito('checkout');
      });
    }

    var volverBtn = document.getElementById('carrito-volver-btn');
    if (volverBtn) {
      volverBtn.addEventListener('click', function (e) {
        e.preventDefault();
        mostrarEstadoCarrito('lista');
      });
    }

    var pagarBtn = document.getElementById('carrito-pagar-btn');
    if (pagarBtn) {
      pagarBtn.addEventListener('click', pagarCarrito);
    }

    var cerrarBtn = document.getElementById('carrito-cerrar-btn');
    if (cerrarBtn) {
      cerrarBtn.addEventListener('click', function () {
        if (typeof $ !== 'undefined') { $('#carrito-modal').modal('hide'); }
        cargarRegalos(); // refresca las tarjetas con el nuevo estado/progreso
      });
    }
  });

  // ── Carga y render de regalos ──────────────────────────────────
  // Google Apps Script tarda varios segundos en responder (naturaleza del
  // servicio, no de este sitio). Para que no se sienta tan lento:
  // 1) si hay una lista guardada de una visita anterior, se muestra al
  //    instante mientras se pide la versión fresca en segundo plano.
  // 2) si no hay nada guardado, mostramos un esqueleto de tarjetas en vez
  //    de dejar la pantalla en blanco/con solo texto.
  // v2: si cambias la forma de los datos de un regalo otra vez en el futuro,
  // sube este número — invalida automáticamente cualquier caché vieja de
  // navegadores que quedó guardada con el formato anterior.
  var CLAVE_CACHE_LOCAL = 'regalos_cache_v2';

  function cargarRegalos() {
    var cacheado = leerCacheLocal();
    if (cacheado) {
      renderizarRegalos(cacheado);
    } else {
      mostrarEsqueleto();
    }

    fetch(API_URL + '?accion=listarRegalos')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) {
          if (!cacheado) mostrarMensaje('No se pudieron cargar los regalos. Intenta más tarde.');
          return;
        }
        guardarCacheLocal(data.regalos || []);
        renderizarRegalos(data.regalos || []);
      })
      .catch(function () {
        if (!cacheado) mostrarMensaje('Error de conexión al cargar los regalos.');
      });
  }

  function renderizarRegalos(regalos) {
    window.__regalos = regalos; // cache en memoria para leer nombre/tipo/etc al armar el carrito

    if (!regalos.length) {
      mostrarMensaje('Aún no hay regalos disponibles.');
      return;
    }

    construirFiltros(regalos);
    renderizarGrid();
  }

  // ── Filtros por categoría ────────────────────────────────────
  function construirFiltros(regalos) {
    var wrap = document.getElementById('regalos-filtros');
    if (!wrap) return;

    var categorias = [];
    regalos.forEach(function (r) {
      var cat = r.categoria || 'Otros';
      if (categorias.indexOf(cat) === -1) categorias.push(cat);
    });

    // Si solo hay una categoría (o ninguna), no tiene caso mostrar filtros.
    if (categorias.length < 2) {
      wrap.innerHTML = '';
      return;
    }

    var pills = ['<span class="regalo-filtro-pill" data-filtro="todos">Todos</span>'];
    categorias.forEach(function (cat) {
      pills.push('<span class="regalo-filtro-pill" data-filtro="' + escaparHtml(cat) + '">' + escaparHtml(cat) + '</span>');
    });

    wrap.innerHTML = pills.join('');
    actualizarPillsActivas();
  }

  function actualizarPillsActivas() {
    var wrap = document.getElementById('regalos-filtros');
    if (!wrap) return;
    wrap.querySelectorAll('.regalo-filtro-pill').forEach(function (pill) {
      pill.classList.toggle('activo', pill.getAttribute('data-filtro') === filtroActivo);
    });
  }

  function renderizarGrid() {
    var regalos = window.__regalos || [];
    var filtrados = filtroActivo === 'todos'
      ? regalos
      : regalos.filter(function (r) { return (r.categoria || 'Otros') === filtroActivo; });

    if (!filtrados.length) {
      mostrarMensaje('No hay regalos en esta categoría todavía.');
      return;
    }

    document.getElementById('regalos-grid').innerHTML = filtrados.map(construirTarjeta).join('');
  }

  function mostrarMensaje(texto) {
    document.getElementById('regalos-grid').innerHTML =
      '<div class="col-md-12 text-center"><p>' + escaparHtml(texto) + '</p></div>';
  }

  function mostrarEsqueleto() {
    var tarjeta =
      '<div class="col-md-4 col-sm-6">' +
        '<div class="regalo-card regalo-skeleton">' +
          '<div class="regalo-img-wrap"><div class="regalo-skeleton-bloque" style="height:220px;"></div></div>' +
          '<div class="regalo-content">' +
            '<div class="regalo-skeleton-bloque" style="height:18px; width:60%; margin-bottom:10px;"></div>' +
            '<div class="regalo-skeleton-bloque" style="height:14px; width:90%; margin-bottom:16px;"></div>' +
            '<div class="regalo-skeleton-bloque" style="height:36px; width:100%;"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('regalos-grid').innerHTML = tarjeta + tarjeta + tarjeta;
  }

  function leerCacheLocal() {
    try {
      var crudo = sessionStorage.getItem(CLAVE_CACHE_LOCAL);
      if (!crudo) return null;
      var datos = JSON.parse(crudo);
      // Blindaje extra: si por lo que sea quedó guardado algo que no trae
      // "categoria" (formato viejo), lo tratamos como inválido en vez de
      // mostrar tarjetas sin poder filtrar.
      if (!Array.isArray(datos) || (datos.length && !('categoria' in datos[0]))) {
        return null;
      }
      return datos;
    } catch (err) {
      return null;
    }
  }

  function guardarCacheLocal(regalos) {
    try {
      sessionStorage.setItem(CLAVE_CACHE_LOCAL, JSON.stringify(regalos));
    } catch (err) { /* si el navegador bloquea sessionStorage, no pasa nada grave */ }
  }

  // ── Tarjeta de regalo ────────────────────────────────────────
  function construirTarjeta(regalo) {
    var agotado = regalo.tipo === 'unico' && regalo.estado === 'agotado';
    var enCarrito = carrito.some(function (i) { return i.id === regalo.id; });
    var foto = regalo.foto || 'img/logo.png';

    var cuerpo;
    if (regalo.tipo === 'unico') {
      if (agotado) {
        cuerpo =
          '<span class="regalo-precio" style="color:#c0392b;">Ya fue regalado, ¡gracias!</span>' +
          '<button class="btn btn-fill btn-small" disabled style="opacity:.5; cursor:not-allowed;">Agotado</button>';
      } else {
        cuerpo =
          '<span class="regalo-precio">$' + formatoMoneda(regalo.precio) + ' MXN</span>' +
          '<button class="btn btn-small regalo-btn' + (enCarrito ? ' en-carrito' : ' btn-fill') + '" ' +
            'data-id="' + escaparHtml(regalo.id) + '" data-monto="' + regalo.precio + '">' +
            (enCarrito ? '<i class="fa fa-check"></i> En tu carrito' : 'Agregar al carrito') +
          '</button>';
      }
    } else {
      var pct = regalo.meta > 0 ? Math.min(100, Math.round((regalo.recaudado / regalo.meta) * 100)) : 0;
      var completo = regalo.meta > 0 && regalo.recaudado >= regalo.meta;
      var itemCarrito = carrito.filter(function (i) { return i.id === regalo.id; })[0];

      if (completo) {
        cuerpo =
          '<div class="regalo-progress-track"><div class="regalo-progress-fill" style="width:100%;"></div></div>' +
          '<p class="regalo-progress-label">$' + formatoMoneda(regalo.recaudado) + ' de $' + formatoMoneda(regalo.meta) + ' MXN (100%)</p>' +
          '<button class="btn btn-fill btn-small" disabled style="opacity:.5; cursor:not-allowed;">¡Meta completada!</button>';
      } else {
        var opciones = MONTOS_SUGERIDOS.map(function (m) {
          var activo = itemCarrito && itemCarrito.monto === m;
          return '<span class="regalo-monto-opcion' + (activo ? ' activo' : '') + '" data-monto="' + m + '">$' + formatoMoneda(m) + '</span>';
        }).join('');
        var montoInicial = itemCarrito ? itemCarrito.monto : MONTOS_SUGERIDOS[0];

        cuerpo =
          '<div class="regalo-progress-track"><div class="regalo-progress-fill" style="width:' + pct + '%;"></div></div>' +
          '<p class="regalo-progress-label">$' + formatoMoneda(regalo.recaudado) + ' de $' + formatoMoneda(regalo.meta) + ' MXN (' + pct + '%)</p>' +
          '<div class="regalo-monto-picker">' + opciones + '</div>' +
          '<input type="number" min="' + MONTO_MINIMO + '" step="1" class="regalo-monto-custom" placeholder="Otro monto (mínimo $' + MONTO_MINIMO + ')">' +
          '<button class="btn btn-small regalo-btn' + (enCarrito ? ' en-carrito' : ' btn-fill') + '" ' +
            'data-id="' + escaparHtml(regalo.id) + '" data-monto="' + montoInicial + '" style="margin-top:10px;">' +
            (enCarrito ? '<i class="fa fa-check"></i> Actualizar en el carrito' : 'Agregar al carrito') +
          '</button>';
      }
    }

    return (
      '<div class="col-md-4 col-sm-6">' +
        '<div class="regalo-card' + (agotado ? ' agotado' : '') + '">' +
          '<div class="regalo-img-wrap">' +
            (agotado ? '<span class="regalo-ribbon">Agotado</span>' : '') +
            '<img class="regalo-img" src="' + escaparHtml(foto) + '" alt="' + escaparHtml(regalo.nombre) + '">' +
          '</div>' +
          '<div class="regalo-content">' +
            '<h4>' + escaparHtml(regalo.nombre) + '</h4>' +
            '<p>' + escaparHtml(regalo.descripcion) + '</p>' +
            cuerpo +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Carrito ──────────────────────────────────────────────────
  var CLAVE_CARRITO = 'regalo_carrito_v1';

  function cargarCarritoLocal() {
    try {
      var crudo = sessionStorage.getItem(CLAVE_CARRITO);
      carrito = crudo ? JSON.parse(crudo) : [];
    } catch (err) {
      carrito = [];
    }
  }

  function guardarCarritoLocal() {
    try {
      sessionStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (err) { /* si el navegador bloquea sessionStorage, no pasa nada grave */ }
  }

  function agregarAlCarritoDesdeTarjeta(btn) {
    var id = btn.getAttribute('data-id');
    var monto = Number(btn.getAttribute('data-monto')) || 0;
    var regalo = (window.__regalos || []).filter(function (r) { return r.id === id; })[0];
    if (!regalo) return;

    if (regalo.tipo === 'fondo' && monto < MONTO_MINIMO) {
      btn.closest('.regalo-content').querySelector('.regalo-monto-custom').focus();
      return;
    }

    var existente = carrito.filter(function (i) { return i.id === id; })[0];
    if (existente) {
      existente.monto = monto;
    } else {
      carrito.push({ id: id, nombre: regalo.nombre, tipo: regalo.tipo, monto: monto, foto: regalo.foto });
    }

    guardarCarritoLocal();
    actualizarBotonFlotante();
    renderizarGrid(); // para reflejar "En tu carrito" en la tarjeta
  }

  function quitarDelCarrito(id) {
    carrito = carrito.filter(function (i) { return i.id !== id; });
    guardarCarritoLocal();
    actualizarBotonFlotante();
    renderizarGrid();
  }

  function totalCarrito() {
    return carrito.reduce(function (acc, i) { return acc + (Number(i.monto) || 0); }, 0);
  }

  function actualizarBotonFlotante() {
    var boton = document.getElementById('carrito-flotante');
    if (!boton) return;
    if (!carrito.length) {
      boton.style.display = 'none';
      return;
    }
    boton.style.display = 'flex';
    document.getElementById('carrito-flotante-contador').textContent = carrito.length;
    document.getElementById('carrito-flotante-total').textContent = '$' + formatoMoneda(totalCarrito()) + ' MXN';
  }

  function renderizarCarritoModal() {
    var wrap = document.getElementById('carrito-items');
    if (!carrito.length) {
      wrap.innerHTML = '<p class="text-center" style="color:#888; padding:20px 0;">Tu carrito está vacío. Cierra esta ventana y elige algún regalo.</p>';
      document.getElementById('carrito-continuar-btn').style.display = 'none';
    } else {
      document.getElementById('carrito-continuar-btn').style.display = 'block';
      wrap.innerHTML = carrito.map(function (item) {
        return (
          '<div class="carrito-item">' +
            '<img src="' + escaparHtml(item.foto || 'img/logo.png') + '" alt="">' +
            '<div class="carrito-item-info">' +
              '<p class="carrito-item-nombre">' + escaparHtml(item.nombre) + '</p>' +
              '<p class="carrito-item-monto">$' + formatoMoneda(item.monto) + ' MXN</p>' +
            '</div>' +
            '<span class="carrito-item-quitar" data-id="' + escaparHtml(item.id) + '" title="Quitar">&times;</span>' +
          '</div>'
        );
      }).join('');
    }
    document.getElementById('carrito-total').textContent = '$' + formatoMoneda(totalCarrito()) + ' MXN';
  }

  function mostrarEstadoCarrito(estado) {
    document.getElementById('carrito-lista-contenido').style.display = estado === 'lista' ? 'block' : 'none';
    document.getElementById('carrito-checkout-contenido').style.display = estado === 'checkout' ? 'block' : 'none';
    document.getElementById('carrito-confirmacion').style.display = estado === 'confirmacion' ? 'block' : 'none';
  }

  function pagarCarrito() {
    var nombre = document.getElementById('carrito-nombre').value.trim();
    var telefono = document.getElementById('carrito-telefono').value.trim();
    var nota = document.getElementById('carrito-nota').value.trim();
    var alertBox = document.getElementById('carrito-checkout-alert');
    var btn = document.getElementById('carrito-pagar-btn');

    alertBox.innerHTML = '';

    if (!carrito.length) {
      alertBox.innerHTML = mensajeError('Tu carrito está vacío.');
      return;
    }
    if (!nombre || !telefono) {
      alertBox.innerHTML = mensajeError('Completa tu nombre y teléfono para continuar.');
      return;
    }
    if (telefono.replace(/\D/g, '').length < 10) {
      alertBox.innerHTML = mensajeError('Escribe un número de teléfono válido (mínimo 10 dígitos).');
      return;
    }

    var textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Conectando con Mercado Pago&hellip;';

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        accion: 'iniciarPagoCarrito',
        items: carrito.map(function (i) { return { regaloId: i.id, monto: i.monto }; }),
        nombre: nombre,
        telefono: telefono,
        nota: nota
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success && data.url) {
          try {
            sessionStorage.setItem('regalo_pendiente', JSON.stringify({ nombre: nombre, nota: nota, items: carrito }));
          } catch (err) { /* si el navegador bloquea sessionStorage, no pasa nada grave */ }
          vaciarCarrito();
          window.location.href = data.url; // redirige al checkout de Mercado Pago
          return;
        }

        btn.disabled = false;
        btn.innerHTML = textoOriginal;

        if (data.success && data.testMode) {
          mostrarConfirmacion(nombre, nota, carrito);
          vaciarCarrito();
          return;
        }

        alertBox.innerHTML = mensajeError(data.message || 'No se pudo iniciar el pago. Intenta de nuevo.');
      })
      .catch(function () {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
        alertBox.innerHTML = mensajeError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      });
  }

  function vaciarCarrito() {
    carrito = [];
    guardarCarritoLocal();
    actualizarBotonFlotante();
  }

  // Muestra la pantalla "¡Regalo(s) Enviado(s)!" con el mensaje del
  // invitado, reutilizada tanto por el modo de prueba (al instante) como
  // al volver de pagar de verdad en Mercado Pago.
  function mostrarConfirmacion(nombre, nota, items) {
    var esPlural = items && items.length > 1;
    document.getElementById('carrito-confirmacion-titulo').textContent =
      esPlural ? '¡Regalos Enviados!' : '¡Regalo Enviado!';

    var listaNombres = items && items.length
      ? items.map(function (i) { return i.nombre; }).join(', ')
      : '';
    document.getElementById('carrito-confirmacion-subtitulo').textContent =
      (listaNombres ? listaNombres + ' — ' : '') + 'gracias de corazón, significa muchísimo para nosotros.';

    var notaWrap = document.getElementById('carrito-confirmacion-nota-wrap');
    if (nota) {
      notaWrap.style.display = 'block';
      document.getElementById('carrito-confirmacion-nota').textContent = '"' + nota + '"';
      document.getElementById('carrito-confirmacion-autor').textContent = '— ' + (nombre || 'Un invitado');
    } else {
      notaWrap.style.display = 'none';
    }

    mostrarEstadoCarrito('confirmacion');

    if (typeof $ !== 'undefined') {
      $('#carrito-modal').modal('show');
    }
  }

  // ── Estado después de volver de Mercado Pago ───────────────────
  function mostrarEstadoDesdeURL() {
    var params = new URLSearchParams(window.location.search);
    var estado = params.get('regalo');
    if (!estado) return;

    if (estado === 'exito') {
      var pendiente = null;
      try {
        pendiente = JSON.parse(sessionStorage.getItem('regalo_pendiente') || 'null');
        sessionStorage.removeItem('regalo_pendiente');
      } catch (err) { /* si falla, mostramos el banner simple de abajo */ }

      if (pendiente) {
        mostrarConfirmacion(pendiente.nombre, pendiente.nota, pendiente.items);
      } else {
        mostrarBanner('alert-success', '¡Gracias! Tu regalo quedó registrado. Significa muchísimo para nosotros. 🎉');
      }
    } else {
      var mensajes = {
        pendiente: ['alert-info', 'Tu pago está pendiente de confirmación. Te avisaremos cuando se procese.'],
        error: ['alert-danger', 'Tu pago no se pudo completar. Puedes intentar de nuevo cuando quieras.']
      };
      var m = mensajes[estado];
      if (m) mostrarBanner(m[0], m[1]);
    }

    // limpiar el query param para que no reaparezca al recargar
    params.delete('regalo');
    var nuevaURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + '#regalos';
    window.history.replaceState({}, '', nuevaURL);
  }

  function mostrarBanner(clase, mensaje) {
    var wrapper = document.getElementById('regalos-alert-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML =
      '<div class="alert ' + clase + '" style="border-radius:4px; padding:12px 18px; margin-bottom:20px;">' + escaparHtml(mensaje) + '</div>';
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── helpers ─────────────────────────────────────────────────
  function mensajeError(texto) {
    return '<div class="alert alert-danger" style="border-radius:4px; padding:10px 15px; margin-top:10px;">' + escaparHtml(texto) + '</div>';
  }

  function formatoMoneda(num) {
    return Number(num || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }

  function escaparHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
