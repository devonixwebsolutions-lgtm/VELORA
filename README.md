# VELORA — Journeys & Estates

A fictional travel and real estate agency with 151 routes, animated page transitions, an immersive collection gallery, 36 photographs at 3840px width, and native 4K videos. Booking and property inquiries save on the visitor's device; no reservation, email or payment is made.

## Run locally

Install Node.js 22.13 or newer, open this folder in your editor, then run:

```sh
npm start
```

Open `http://localhost:4173/VELORA/`. No dependencies or API keys are required.

## Build and check

```sh
npm run build
npm run check
```

The build generates a static `dist/` folder and individual HTML files for all 151 routes. It adapts assets, API content loading, links and the Nuxt router to GitHub Pages' `/VELORA/` project path. The GitHub Actions workflow deploys that folder to Pages after a push to `main`.

## Edit

- `public/content/`: editable page, collection, journal and experience data.
- `public/velora.css`: brand styling and booking form styles.
- `public/velora-booking.js`: local booking and property inquiry dialog.
- `public/velora-media-core.mjs`: scroll video playback and poster fallback.
- `public/media/velora/manifest.json`: stock asset licenses, creators and source URLs.
- `public/_nuxt/`: retained compiled Vue, Nuxt, GSAP and Three.js runtime.

The retained animation runtime is distributed as compiled browser modules. Photographs and video have their individual stock licenses; see the manifest. All collection names, properties, rates and agency content are illustrative.
