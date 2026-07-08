# Playmon

Playmon is a **mobile multi-core emulator application** designed specifically for
Pokémon games.

## Core Product Goals

- Multi-core support (different emulator cores for different Pokémon platforms)
- In-app core library with downloadable cores from trusted third-party sources
- In-app Pokémon ROM library (third-party fetched) with search and direct download/play
- Pokémon-focused UX (save states, quick load, game library management)
- Cheats support and deep customization (input, graphics, audio, speed, themes)
- Smooth performance across **low-end, mid-end, and high-end** mobile devices

## Planned Architecture (MVP)

### 1) Mobile App Shell
- Cross-platform mobile shell (Android-first, iOS-ready)
- ROM library management with metadata, cover art, and play history
- Save states, auto-save, and restore

### 2) Core Runtime
- Pluggable emulator core interface
- Runtime core selection per game
- Per-core compatibility profile and settings

### 3) Core Download Library
- Fetch available cores from a third-party catalog endpoint
- Display version, compatibility, and integrity info
- Download/install/update/remove cores in-app

### 4) ROM Catalog + Import/Export
- Fetch Pokémon ROM listings from third-party catalog sources
- Search and filter ROMs in-app, then download and play directly
- Support custom ROM import and export for user-managed collections

### 5) Pokémon-Focused Features
- Fast-forward, rewind (where supported), and frame skip
- Cheats manager (import/export, enable/disable per game)
- Controller mapping, touch layout editor, and vibration options

### 6) Device Performance Profiles
- **Low-end:** reduced rendering scale, aggressive frame skip, battery saver defaults
- **Mid-end:** balanced profile with optional enhancements
- **High-end:** HD rendering, shaders, enhanced audio/latency settings

## Non-Functional Requirements

- Startup time optimized for older devices
- Stable emulation with crash-safe save state handling
- Background-safe download manager for large core files
- Secure remote fetch validation (checksum/signature support when available)

## Roadmap

1. Build mobile shell + local game library
2. Integrate pluggable core runtime
3. Add third-party core catalog fetch/download flow
4. Add third-party Pokémon ROM catalog with search/download/play + import/export
5. Add cheats/customization UI
6. Tune profiles and benchmarks for low/mid/high-end devices
