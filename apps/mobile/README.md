# Couple Book Mobile

Expo Router workspace for the native Couple Book client.

Current implementation status:

- shared Couple Book theme IDs and date helpers are wired in
- primary tabs are `Home`, `Story`, `Album`, `Plans`, and `Settings`
- lint and TypeScript checks run from the repo root
- permanent native app identity is `com.jaylan.couplebook`
- Android and iPhone development work uses Couple Book's own Expo development build, not Expo Go

Current commands:

- `npm run mobile:dev`
- `npm run mobile:android`
- `npm run mobile:android -- --clear`
- `npm --workspace apps/mobile run android:build`
- `npm run mobile:web`
- `npm run mobile:lint`
- `npm run mobile:typecheck`

This workspace is intentionally tied to the shared packages under `packages/` and the existing web app in `app-v2/`.
