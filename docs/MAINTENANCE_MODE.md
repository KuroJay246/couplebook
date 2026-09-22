# Couple Book Maintenance Mode

Couple Book has a zero-cost public maintenance mode controlled by one public status file:

`app-v2/public/maintenance-status.json`

Default production state must stay:

```json
{
  "enabled": false,
  "message": "Couple Book is getting a careful update.",
  "details": "The app may be unavailable for a short time while improvements are reviewed. Your private memories, photos, videos, and special moments stay protected.",
  "expectedReturnAt": "",
  "updateId": ""
}
```

## Turning Maintenance On

Change only `enabled` to `true` and optionally set:

- `message`: public headline only.
- `details`: public explanation only.
- `expectedReturnAt`: optional ISO date/time.
- `updateId`: optional public release or update label.

Do not put private relationship content, file names, Drive links, auth details, credentials, tokens, or incident details in this file. It is intentionally browser-readable.

## Behavior

- `/update` and `/maintenance` are public routes and do not require Firebase sign-in.
- When `enabled` is `true`, normal app routes render the maintenance page before protected auth routes load.
- When `enabled` is `false`, protected routes continue through the normal Firebase/Auth/Couple Book authorization flow.
- If the status file cannot be fetched, the app fails open to the normal app instead of leaving users stuck on an indefinite loader.
- The PWA update banner is separate from maintenance mode.

## Cache Boundary

`firebase.json` sets `Cache-Control: no-store, max-age=0` for `/maintenance-status.json`, and the service worker fetches that file with `cache: 'no-store'`. This prevents the PWA shell from keeping a stale maintenance state longer than necessary.

## Deployment Boundary

This is a static Firebase Hosting mechanism. Toggling maintenance on a hosted preview or production site still requires deploying the changed public status file to that target. Do not deploy production without owner approval.
