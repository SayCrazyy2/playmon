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

### 1) One-time setup

```bash
npm install
npx eas login
npx eas build:configure
```

### 2) Signed preview APK (internal testing)

```bash
npm run build:android:preview
```

This uses `eas.json` profile `preview` and produces a signed APK for tester installs.

### 3) Production AAB (Play Store)

```bash
npm run build:android:production
```

This uses `eas.json` profile `production`, auto-increments app version remotely, and creates a signed AAB.

### 4) Submit production build to Play Console internal track

```bash
npm run submit:android:production
```

## CI automation

GitHub Actions workflow: `/home/runner/work/playmon/playmon/.github/workflows/android-eas-build.yml`

- Manual dispatch with profile selection (`preview` or `production`)
- Automatic production build on version tags (`v*.*.*`)

Required GitHub secret:

- `EXPO_TOKEN`: Expo access token with EAS build/submit permissions

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
