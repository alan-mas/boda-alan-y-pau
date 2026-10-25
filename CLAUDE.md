# CLAUDE.md

Guía para Claude Code en este repositorio.

> **Al iniciar cada sesión: lee primero [`TODO.md`](TODO.md)** — ahí está qué ya se terminó, qué falta y en qué nos quedamos. Al cerrar un bloque de trabajo, actualízalo (mueve tareas a "Hecho" con fecha y agrega las nuevas).

> **Prioridad permanente: ahorrar tokens, recursos y gastos.**
> - No repetir el análisis inicial: confiar en este archivo y en `TODO.md`; leer solo los archivos/rangos necesarios para la tarea (`grep`/`sed -n` antes que leer archivos completos; `index.html` y los `.min.*` son grandes).
> - Nada de recursividad innecesaria: no lanzar subagentes, no releer lo que ya se leyó o editó, no re-verificar lo ya verificado, no iterar en bucles de prueba sin necesidad.
> - Agrupar llamadas independientes en paralelo y comandos relacionados en uno solo.
> - Verificar sin capturas de pantalla salvo que el cambio sea visual (curl, DOM, consola).
> - Respuestas cortas y al grano; sugerir sesión nueva (`/clear`) al terminar un bloque grande de trabajo.

## Qué es

Sitio web de la boda de **Pau y Alan** — **27 y 28 de febrero de 2027**, Quinta Regina, Chihuahua capital, México. Todo el sitio está en español.

- Basado en la plantilla open-source `rampatra/wedding-website` (GPL-3.0); hay que conservar `LICENSE` y el crédito en el `README.md`.
- Repo: `github.com/alan-mas/boda-alan-y-pau` (**público**), rama `master` (única rama). URL pública: https://alan-mas.github.io/boda-alan-y-pau/
- Vista previa al compartir (WhatsApp/Facebook): `img/og-preview.jpg` (1200×630) con URLs absolutas en las etiquetas `og:` de `index.html` y `regalos.html`. Sin Google Analytics.
- Hosting: **GitHub Pages**, desplegado por `.github/workflows/npm-gulp.yml` en cada push a `master` (corre `npm install` + `npx gulp` y publica toda la carpeta).
- Backend: un único **Google Apps Script** (`google-apps-script/Code.gs`) desplegado como Web App, ligado al Google Sheet "RSVP Boda". Pagos con **Mercado Pago**.

## Comandos

```bash
npm install        # dependencias
gulp               # compila SCSS → css/styles.min.css y minifica js/scripts.js → js/scripts.min.js
gulp sass          # solo SCSS
gulp minify-js     # solo JS
```

Abrir los `.html` directo en el navegador; no hace falta servidor.

## Páginas

| Archivo | Qué es | JS |
|---|---|---|
| `index.html` | Sitio principal: hero, invitación + countdown + compartir por WhatsApp, historia, eventos (boda/tornaboda), modal de itinerario, modal de código de vestimenta, "sin niños", Instagram, galería de compromiso (carrusel), video, mapa (iframe), hospedaje, banner a regalos, RSVP, sección Chihuahua, footer | `scripts.min.js`, `rsvp.js` |
| `regalos.html` | Mesa de Regalos con carrito y checkout a Mercado Pago | `regalos.js` |
| `sesion-completa.html` | Galería completa de la sesión de compromiso | `sesion.js` |
| `dashboard.html` | Panel de control privado (noindex) con estadísticas de RSVP y regalos, protegido por contraseña validada en el backend | `dashboard.js` |

## Backend (`google-apps-script/Code.gs`)

- **Está en `.gitignore`** porque contiene el token de Mercado Pago y la contraseña del dashboard. Nunca subirlo al repo.
- **Deploy automatizado con clasp** (desde 2026-10-25): tras editar `Code.gs`, correr `bash google-apps-script/deploy.sh "descripción"` — hace `clasp push` y actualiza el deployment del sitio (`AKfycbxr8…`, misma URL `/exec`, nueva versión). Verificar con `curl -sL "<URL /exec>?accion=listarRegalos"`. Claude lo corre directamente; ya no hace falta copiar/pegar en el editor.
  - Config en `google-apps-script/.clasp.json` (scriptId del script ligado al Sheet) y `.claspignore` (solo sube `Code.gs` y `appsscript.json`). Sesión de Google de Alan en `~/.clasprc.json` — nunca leerla ni mostrarla.
  - Cambios hechos en el editor en línea se pierden con el siguiente push: si Alan editó en línea, primero comparar con `clasp pull` en el scratchpad.
  - Editar **datos** del Sheet (regalos, precios) no requiere deploy; solo cambios de código.
- La misma URL `/exec` está en `js/rsvp.js`, `js/regalos.js` y `js/dashboard.js`.
- Rutas: `doPost` → RSVP (por defecto), `accion: 'iniciarPagoCarrito'`, webhook de Mercado Pago. `doGet` → `accion=listarRegalos`, `accion=estadisticas`.
- Config al inicio del archivo: `SPREADSHEET_ID`, `MERCADO_PAGO_ACCESS_TOKEN`, `SITE_URL`, `MODO_PRUEBA_PAGOS`, `DASHBOARD_PASSWORD`.
- `google-apps-script/test-rsvp.sh` — pipeline de pruebas reales contra el endpoint desplegado (usar solo códigos de prueba desechables).

### Hojas del Sheet
- **Invitados** — un código de invitación de 6 caracteres por invitado (generado con `generarCodigos()`); col. I "Asiste Boda", J "Asiste Tornaboda".
- **Confirmaciones** — bitácora de RSVPs; col. E "Asiste Boda", F "Asiste Tornaboda".
- **Regalos** — `ID · Nombre · Descripcion · Foto · Tipo(unico/fondo) · Precio · Meta · Recaudado · Estado · Comprador · Categoria`.
- **Pagos_Regalos** — bitácora privada de pagos (incluye teléfono y nota).

## Reglas de negocio (decididas por Alan, no cambiar sin preguntar)

- **RSVP:** el **código de invitación es el único control**; el nombre que escribe el invitado se guarda solo como referencia. **No hay campo de acompañantes** (se manejan a mano en Excel). Boda y tornaboda se confirman por separado y **no se puede confirmar tornaboda sin boda** (validado en frontend y en backend). Evento solo para adultos.
- **Regalos:** dos tipos — **"fondo"** (meta acumulable, barra de progreso, varios aportan) y **"único"** (precio fijo, el primero que paga se lo queda; `LockService` evita doble venta). Checkout pide **nombre + teléfono, sin correo**. El invitado puede dejar una nota que solo ve la pareja.
- Rendimiento de regalos: caché servidor (`CacheService`, 30 s) + `sessionStorage` en cliente + skeleton UI.

## Trampas conocidas

- **SCSS es la fuente de verdad.** Nunca editar `css/styles.min.css` ni `js/scripts.min.js`: gulp los sobreescribe. Si el SCSS y el compilado no coinciden, **preguntar** cuál es el valor correcto antes de "arreglar" (ya pasó que el compilado era el bueno, p. ej. la foto del hero `hero-min-copy.jpg`).
- **Inyección de fórmulas en Sheets:** lo único que funciona es anteponer un espacio a strings que empiezan con `= + - @ \t \r` (`sanitizarTexto()`). Apóstrofe o `setNumberFormat('@')` NO funcionan.
- **Apps Script + dominio externo nuevo** (`UrlFetchApp`) requiere autorizar OAuth ejecutando desde el editor una función que contenga esa llamada concreta.
- **Mercado Pago sandbox:** las credenciales de prueba también pueden empezar con `APP_USR-`; un pago de prueba requiere vendedor de prueba **y** comprador logueado como usuario de prueba.
- `img/eng_pics/FULL JPG/` (~600 MB de originales) está en `.gitignore`; las versiones web se generan con `tools/procesar-sesion-fotos.sh` en `img/eng_pics/sesion-completa/`.
- macOS a veces revoca el acceso a `~/Documents` (EPERM): hay que reactivar el permiso en Ajustes **y** cerrar/reabrir la app.

## Forma de trabajo con Alan

- Pide **pruebas reales ejecutadas** (curl al endpoint, códigos desechables), no solo revisión de código, sobre todo en seguridad y pagos.
- Cuida el consumo de tokens: preferir verificación no visual (curl, DOM) sobre capturas de pantalla; sugerir sesión nueva al terminar un bloque grande.
- Prefiere que las cosas queden "listas" con pocos pasos manuales; cuando un paso manual sea inevitable (deploy de Apps Script, cambios en el Sheet), dárselo explícito paso a paso.
- Respaldos de carpeta completos fuera del repo: `../wedding-website-BACKUP-estable-20260808-174426` (tema blanco, vigente) y `../wedding-website-BACKUP-negro-20260808-180056` (rediseño negro descartado).

## Librerías (vendoreadas en `js/` y `css/`)

jQuery 1.11 + Bootstrap 3 grid, Flexslider, FancyBox, Waypoints + animate.css (clases `.wp1`–`.wp9`), jquery.mb.YTPlayer, ouical (agregar al calendario), normalize. `animate.css` y `font-awesome` se cargan de `node_modules/` con fallback a CDN.
