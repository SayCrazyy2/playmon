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
