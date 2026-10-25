# Boda Pau y Alan 💍

Sitio web de nuestra boda — **27 y 28 de febrero de 2027**, Quinta Regina, Chihuahua, México.

🌐 **https://alan-mas.github.io/boda-alan-y-pau/**

## Qué incluye

- Invitación con cuenta regresiva y botón para compartir por WhatsApp
- Detalles de la boda y la tornaboda, itinerario y código de vestimenta
- Galería de la sesión de compromiso (`sesion-completa.html`)
- Mapa del lugar y opciones de hospedaje
- **Confirmación de asistencia (RSVP)** con código de invitación, guardada en Google Sheets
- **Mesa de Regalos** (`regalos.html`) con carrito y pago vía Mercado Pago
- Panel de control privado con estadísticas de confirmaciones y regalos (`dashboard.html`)

## Tecnología

Sitio estático (HTML, SCSS, jQuery) publicado en **GitHub Pages**. El backend es un Google Apps Script ligado a un Google Sheet; el código del script no se publica en este repo.

## Desarrollo

```bash
npm install   # dependencias
npx gulp      # compila sass/ → css/styles.min.css y js/scripts.js → js/scripts.min.js
```

Abre `index.html` en el navegador para verlo localmente. Cada push a `master` compila y publica el sitio automáticamente (`.github/workflows/npm-gulp.yml`).

## Créditos

Basado en la plantilla open-source [wedding-website](https://github.com/rampatra/wedding-website) de Ram Patra, bajo licencia [GPL-3.0](LICENSE).
