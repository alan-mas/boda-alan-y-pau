/* Selector de idioma flotante (B7).
 * El HTML se queda en español; este script guarda el texto original de cada
 * nodo y lo reemplaza con el diccionario del idioma elegido (js/i18n/<id>.js,
 * cargado bajo demanda). Lo que no está en el diccionario se queda en español.
 * Pársel no tiene diccionario: se genera siseando el español. */
(function () {
  'use strict';

  var IDIOMAS = [
    { id: 'es',  bandera: '🇲🇽', nombre: 'Español',  lang: 'es' },
    { id: 'en',  bandera: '🇺🇸', nombre: 'English',  lang: 'en' },
    { id: 'nor', bandera: '🤠', nombre: 'Norteño',  lang: 'es-MX' },
    { id: 'pir', bandera: '🏴‍☠️', nombre: 'Pirata',   lang: 'es' },
    { id: 'par', bandera: '🐍', nombre: 'Pársel',   lang: 'es' }
  ];
  var CLAVE = 'boda_idioma';
  var ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt'];
  var VERSION = '20261121';

  window.I18N_DICT = window.I18N_DICT || {};
  var actual = 'es';
  var nodos = [];      // { nodo, lead, texto, trail }
  var atributos = [];  // { el, attr, texto }

  function normalizar(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function parsel(s) {
    return s
      .replace(/[sz]/g, 'sss')
      .replace(/[SZ]/g, 'SSS')
      .replace(/c([eiéí])/g, 'sss$1');
  }

  function traducir(texto, id) {
    if (id === 'es') return texto;
    if (id === 'par') return parsel(texto);
    var dic = window.I18N_DICT[id] || {};
    return dic[texto] || texto;
  }

  // API para mensajes dinámicos (rsvp.js)
  window.i18nT = function (texto) { return traducir(normalizar(texto), actual); };

  function recolectar() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (n.parentNode.closest && n.parentNode.closest('.idioma-switcher')) return NodeFilter.FILTER_REJECT;
        return /[A-Za-zÁÉÍÓÚáéíóúñ]{2}/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      var m = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
      nodos.push({ nodo: n, lead: m[1], texto: normalizar(m[2]), trail: m[3] });
    }
    ATRIBUTOS.forEach(function (attr) {
      document.querySelectorAll('[' + attr + ']').forEach(function (el) {
        if (el.closest('.idioma-switcher')) return;
        var v = el.getAttribute(attr);
        if (v && /[A-Za-zÁÉÍÓÚáéíóúñ]{3}/.test(v)) atributos.push({ el: el, attr: attr, texto: normalizar(v) });
      });
    });
  }

  function aplicar(id) {
    actual = id;
    nodos.forEach(function (x) { x.nodo.nodeValue = x.lead + traducir(x.texto, id) + x.trail; });
    atributos.forEach(function (x) { x.el.setAttribute(x.attr, traducir(x.texto, id)); });
    var info = IDIOMAS.filter(function (i) { return i.id === id; })[0] || IDIOMAS[0];
    document.documentElement.setAttribute('lang', info.lang);
    var btn = document.querySelector('.idioma-switcher__btn');
    if (btn) btn.textContent = info.bandera;
    document.querySelectorAll('.idioma-switcher__opcion').forEach(function (o) {
      o.setAttribute('aria-checked', o.getAttribute('data-idioma') === id ? 'true' : 'false');
    });
    try { localStorage.setItem(CLAVE, id); } catch (e) {}
  }

  function cambiar(id) {
    if (id === 'es' || id === 'par' || window.I18N_DICT[id]) { aplicar(id); return; }
    var s = document.createElement('script');
    s.src = 'js/i18n/' + id + '.js?v=' + VERSION;
    s.onload = function () { aplicar(id); };
    document.head.appendChild(s);
  }

  function construirSwitcher() {
    var cont = document.createElement('div');
    cont.className = 'idioma-switcher';
    var html = '<button type="button" class="idioma-switcher__btn" aria-haspopup="true" aria-expanded="false" aria-label="Cambiar idioma / Change language">🇲🇽</button>' +
      '<ul class="idioma-switcher__menu" role="menu">';
    IDIOMAS.forEach(function (i) {
      html += '<li><button type="button" role="menuitemradio" class="idioma-switcher__opcion" data-idioma="' + i.id + '">' +
        '<span>' + i.bandera + '</span> ' + i.nombre + '</button></li>';
    });
    cont.innerHTML = html + '</ul>';
    document.body.appendChild(cont);

    var btn = cont.querySelector('.idioma-switcher__btn');
    function abrir(si) {
      cont.classList.toggle('abierto', si);
      btn.setAttribute('aria-expanded', si ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); abrir(!cont.classList.contains('abierto')); });
    cont.querySelectorAll('.idioma-switcher__opcion').forEach(function (o) {
      o.addEventListener('click', function () { cambiar(o.getAttribute('data-idioma')); abrir(false); });
    });
    document.addEventListener('click', function () { abrir(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') abrir(false); });
  }

  function iniciar() {
    recolectar();
    construirSwitcher();
    var guardado = 'es';
    try { guardado = localStorage.getItem(CLAVE) || 'es'; } catch (e) {}
    if (guardado !== 'es') cambiar(guardado); else aplicar('es');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
