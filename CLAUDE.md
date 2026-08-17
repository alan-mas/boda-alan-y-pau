# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
gulp               # compile SCSS → CSS and minify JS (run after changes to sass/ or js/scripts.js)
gulp sass          # compile SCSS only
gulp minify-js     # minify JS only
```

Open `index.html` directly in a browser — no dev server needed.

## Architecture

This is a static single-page wedding website with no backend. All content lives in `index.html`. The build pipeline (gulp) produces two compiled artifacts:

- `css/styles.min.css` — compiled from `sass/styles.scss`, which imports partials from `sass/partials/` (`_colors.scss`, `_typography.scss`, `_buttons.scss`, `_layout.scss`)
- `js/scripts.min.js` — minified from `js/scripts.js`

**Never edit the `.min.*` files directly** — they are build outputs overwritten by gulp.

### RSVP

The RSVP form submits to a Google Apps Script endpoint (configured in `js/scripts.js`). The script URL must be updated to point to your own deployed Google Apps Script that writes to a Google Sheet.

### CSS fallback strategy

`index.html` loads `animate.css` and `font-awesome` from `node_modules/` with an `onerror` fallback to CDN, so the site works even without running `npm install`.

### Key libraries (vendored in `js/` and `css/`)

- jQuery + Flexslider (image slider)
- FancyBox (lightbox for engagement photos)
- Waypoints + animate.css (scroll-triggered animations via `.wp1`–`.wp9` CSS classes)
- jquery.mb.YTPlayer (YouTube video background)
- Bootstrap grid + normalize.css
