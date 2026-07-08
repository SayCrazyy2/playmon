# Playmon

Playmon is a mobile-first ROM manager and player shell for Pokémon-focused emulation workflows.

## Current MVP (implemented)

- Expo/React Native mobile app foundation
- Third-party ROM catalog URL input + fetch
- In-app ROM search
- ROM download to local device storage
- Custom ROM import from local files
- Local ROM library management (play/delete)
- Direct play flow via embedded EmulatorJS runtime in-app
- Performance profiles (low/mid/high) tuned for smoother gameplay defaults

## Run locally

```bash
npm install
npm run android
```

You can also use:

```bash
npm run ios
npm run web
```

## Android release pipeline (EAS)

### 1) One-time local setup

```bash
npm install
npx eas login
npx eas build:configure
```

### 2) Signed preview APK (internal testing)

```bash
npm run build:android:preview
```

Uses `eas.json` profile `preview` to create a signed APK.

### 3) Production AAB (Play Store)

```bash
npm run build:android:production
```

Uses `eas.json` profile `production` to create a signed AAB and auto-increment app version.

### 4) Submit production build to Play Console internal track

```bash
npm run submit:android:production
```

## GitHub Actions setup (automatic Android releases)

Workflow file: `.github/workflows/android-eas-build.yml`

### 1) Create an Expo access token

1. Sign in to Expo (`https://expo.dev`).
2. Open **Account Settings → Access Tokens**.
3. Create a token with EAS build permissions.

### 2) Add required GitHub repository secret

1. Open your GitHub repository.
2. Go to **Settings → Secrets and variables → Actions**.
3. Add a new secret:
   - `EXPO_TOKEN`: your Expo access token

### 3) Trigger builds

- **Manual build (APK or AAB):**
  - Go to **Actions → Android EAS Build → Run workflow**
  - Select profile:
    - `preview` → signed APK
    - `production` → signed AAB

- **Automatic production build on release tags:**
  - Push a semantic version tag matching `v*.*.*` (example: `v1.0.1`)
  - Tag push automatically triggers a production AAB build

### 4) Where to get the built files

- Open the workflow run in GitHub Actions.
- The EAS build command logs include the Expo build URL.
- Download the final APK/AAB from the Expo build page linked in the logs.

### 5) Troubleshooting checklist

- `EXPO_TOKEN` missing/invalid in repository secrets
- Expo account does not have access to this project
- Android package identifier in `app.json` does not match your configured credentials

## ROM catalog payload format

Set any third-party JSON endpoint that returns either:

```json
[
  {
    "name": "Pokemon Example ROM",
    "url": "https://example.com/game.gba",
    "system": "gba"
  }
]
```

or:

```json
{
  "items": [
    {
      "name": "Pokemon Example ROM",
      "url": "https://example.com/game.gba",
      "system": "gba"
    }
  ]
}
```

Supported ROM extensions/systems in this MVP: `gba`, `gb`, `gbc`, `nes`, `sfc`, `smc`, `snes`, `n64`, `z64`, `nds`.

## Notes

- You are responsible for using legally obtained ROM files and catalog sources.
- EmulatorJS assets are loaded at runtime from its CDN.
