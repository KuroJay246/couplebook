# Couple Book Drive Worker

Cloudflare Workers Free adapter for the Couple Book trusted Google Drive media boundary.

Authoritative core logic remains in `packages/drive-backend`. This package supplies only the Cloudflare runtime adapter: routing, strict CORS, Firebase token verification, Firestore REST access, encrypted KV token storage, and Google Drive HTTP calls.

Required encrypted Worker secrets:

- `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY`

Required KV binding:

- `DRIVE_TOKEN_KV`

Production data remains in Firestore. KV is only for server-owned OAuth state and encrypted Drive refresh credentials.

## Upload Contract

`POST /api/drive/media/upload` accepts the shared upload draft fields from `packages/drive-backend` plus `base64Content`.

The Worker decodes `base64Content`, verifies that its byte length matches `sizeBytes`, uploads the file to the configured Google Drive folder through the owner refresh credential, then finalizes only stable Firestore media metadata. Temporary Drive URLs and OAuth credentials are never returned or stored in media records.

This JSON/base64 path is suitable for trusted functional proof and small uploads. A future large-video UX can replace only the Cloudflare adapter body handling with resumable upload support while keeping the same backend contract and Firestore finalization rules.
