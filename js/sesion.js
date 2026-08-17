(function () {
  'use strict';

  var MANIFEST_URL = 'img/eng_pics/sesion-completa/manifest.json';
  var BASE_URL = 'img/eng_pics/sesion-completa/';

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('sesion-grid');
    if (!grid) return;

    fetch(MANIFEST_URL)
      .then(function (res) { return res.json(); })
      .then(function (nombres) {
        grid.innerHTML = nombres.map(construirTarjeta).join('');
        if (window.jQuery) {
          jQuery('.fancybox').fancybox({ padding: 4, width: 1000, height: 800 });
        }
      })
      .catch(function () {
        grid.innerHTML = '<div class="col-md-12 text-center"><p>No se pudieron cargar las fotos.</p></div>';
      });
  });

  function construirTarjeta(nombre) {
    return (
      '<div class="col-lg-2 col-md-3 col-sm-4 col-xs-6">' +
        '<a class="fancybox img-wrap" rel="sesion" href="' + BASE_URL + nombre + '-lg.jpg">' +
          '<img src="' + BASE_URL + nombre + '-sm.jpg" alt="" loading="lazy">' +
          '<div class="overlay"><i class="fa fa-search-plus"></i></div>' +
        '</a>' +
      '</div>'
    );
  }
})();
