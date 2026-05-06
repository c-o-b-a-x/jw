# Juice WRLD Web App

A React + Vite web app for browsing the Juice WRLD API catalog, opening song detail pages, using radio mode, and managing local playlists.

## Local development

```powershell
npm install
npm run dev
```

## Production build

```powershell
npm run build
```

The production output is generated in `dist/`.

## Render deployment

This repo is prepared for deployment on Render as a static site.

### Included setup

- `render.yaml` is configured for a Render `static_site`
- build command: `npm install && npm run build`
- publish directory: `dist`
- SPA rewrite: `/* -> /index.html`

That rewrite is important because the app uses `react-router-dom` with client-side routes like:

- `/radio`
- `/about`
- `/playlists`
- `/song/:id`
- `/shared/:shareId`

Without the rewrite, direct visits or refreshes on those pages would 404 on a static host.

### Deploy on Render

1. Push this repo to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Static Site.
3. Point Render at this repository.
4. Render should detect `render.yaml` automatically.
5. Deploy.

If you prefer manual settings instead of the blueprint, use:

- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

And add a rewrite rule in Render:

- Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

## Notes

- The web app talks to `https://juicewrldapi.com` directly in production.
- The Vite `/api` proxy in `vite.config.js` is only for local development convenience.
