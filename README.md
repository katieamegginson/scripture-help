# Scripture Help

Scripture Help is now a small full-stack PWA: a backend-backed mobile-friendly app that suggests Bible verses based on how you feel or what question you have, stores your history and saved verses locally, and can serve licensed NIV verse text from the server.

## Why this version

- The backend keeps your Bible API credentials off the client.
- The frontend is installable as a PWA, so it can live on your phone home screen.
- Saved verses and request history remain available offline.
- New lookups can use live NIV text when the backend is configured with API.Bible credentials.

## Features

- Single input for emotions, struggles, or spiritual questions
- Topical scripture matching across a broad set of encouragement themes
- Past request log with verse references
- Saved verses shelf with quick copy/remove actions
- Installable PWA with manifest and service worker
- Server-side NIV lookup via API.Bible

## Important NIV note

The full NIV text is copyrighted, so this project does not bundle the full translation in the repo. Instead, it fetches licensed NIV content from a backend using API.Bible credentials stored in environment variables.

## Run locally

1. Copy `.env.example` to `.env`
2. Fill in your API.Bible values if you have NIV access
3. Start the server:

```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000)

If `BIBLE_API_KEY` and `BIBLE_ID` are not set, the app still works in reference-only mode.

## Deploy it publicly

I recommend Render for this app because it fits a simple Node web service well, gives you a public URL, and works cleanly with this server setup.

Render's official docs say:

- Web services are the right product for dynamic Node apps: [Web Services](https://render.com/docs/web-services)
- Your app must bind to `0.0.0.0`, and Render provides a port in the `PORT` environment variable: [Web Services](https://render.com/docs/web-services)

This project is already prepared for that in [server.js](/Users/katiemegginson/Documents/scripture-help/server.js) and [render.yaml](/Users/katiemegginson/Documents/scripture-help/render.yaml).

### Steps

1. Create a GitHub repo and push this project.
2. Make sure `.env` is not committed. This repo now ignores it via [.gitignore](/Users/katiemegginson/Documents/scripture-help/.gitignore).
3. In Render, create a new Web Service from your GitHub repo.
4. Render should detect [render.yaml](/Users/katiemegginson/Documents/scripture-help/render.yaml).
5. In Render's environment variables, set:
   - `BIBLE_API_KEY`
   - `BIBLE_ID`
6. Deploy.
7. Open the public `onrender.com` URL on your phone.
8. Add it to your home screen to use it like an app.

### Notes

- `HOST` should stay `0.0.0.0`
- `PORT` is supplied by Render automatically
- If NIV access is missing or denied by your API.Bible account, the app will still run in reference-only mode

## Environment variables

- `PORT`: local server port, default `3000`
- `BIBLE_API_BASE_URL`: defaults to `https://rest.api.bible`
- `BIBLE_API_KEY`: your API.Bible key
- `BIBLE_ID`: the NIV Bible ID exposed to your API key
- `BIBLE_VERSION_LABEL`: defaults to `NIV`

## Install on your phone

### iPhone

1. Open the deployed site in Safari
2. Tap `Share`
3. Tap `Add to Home Screen`

### Android

1. Open the deployed site in Chrome
2. Tap `Install app` or use the browser menu
3. Confirm install

## App or PWA?

For this project, PWA is the best first choice.

- It is much faster to ship than a native iOS/Android app.
- You still get a home-screen icon and full-screen app-like experience.
- Updates are instant, without App Store review cycles.
- This app’s core job is forms, saved data, and API lookups, which PWAs handle very well.

Go native later only if you want push notifications, deep device integrations, or App Store distribution as a requirement.

## Security

- Do not commit your real `.env` file
- Since your API key was pasted into chat, rotating it after deployment would be wise
- Put secrets only in your hosting provider's environment variable settings

## Good next upgrades

- User accounts so saved verses sync across devices
- Shareable verse cards
- Voice input for prayer or feelings
- Morning and evening reflection reminders
- A journaling area tied to each scripture lookup
