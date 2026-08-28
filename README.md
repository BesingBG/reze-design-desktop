# Reze Design Desktop

[中文](README.zh-CN.md)

A cross-platform desktop app for editing, playing, and rendering MMD (MikuMikuDance) models and VMD animation clips, built on top of [reze-design](https://github.com/AmyangXYZ/reze-design). Renders locally in real time via WebGPU with an embedded Next.js server — no external services required. Supports Windows & macOS.

![Reze Design Desktop](screenshot.webp)

## Features

- **Offline local rendering & export**: Electron embeds `next start`, no external services needed
- WebGPU auto-detection with troubleshooting guide (dual GPU / driver issues)
- Release build: upstream v0.6.8+ moves demo assets to R2 CDN; release package defaults to an empty scene — bring your own local models
- Online author site link and update check (configured in `config.json`)
- Windows NSIS wizard installer / unsigned macOS dmg (with bypass instructions)

## Cloud Build via GitHub Actions

No local build environment needed? Use GitHub Actions to build Windows & macOS installers in the cloud:

- **Direct download**: Go to the repository **Actions** tab, select `Build Installer (Windows & macOS)`, and open the most recent successful run → download `installer-windows-<version>-<sha>` / `installer-macos-<version>-<sha>` from **Artifacts** at the bottom → unzip to get `Reze-Design-Desktop-<version>-windows-<sha>-Setup.exe` / `Reze-Design-Desktop-<version>-macos-<sha>.dmg`.
  > **Note**: GitHub Actions artifacts require a logged-in GitHub account to download.
- **Fork & build**: Fork this repo (keep it public to use GitHub's free build minutes) → go to **Actions** in your fork → select `Build Installer (Windows & macOS)` → **Run workflow**:
  - `upstream_ref` left empty: builds from the **currently adapted upstream version** (currently v0.6.9, commit 8753d32);
  - Or fill in `latest-commit` (latest default branch commit) / `latest` (latest tag) / a specific tag or commit SHA;
  - `version_override` forces a specific version number; leave empty to auto-read from upstream `package.json`;
  - Check `upload_release` (unchecked by default) to upload win/mac installers as a **Pre-release** to the same tag on this repo (can be edited/deleted/promoted to release later);
  - After build, download from **Artifacts** at the bottom of the run.
- **Trigger**: The workflow is **manual trigger** (`workflow_dispatch`); no scheduled auto-build is enabled. Run it manually from the repository Actions page.

## Requirements

- Node.js 22 (locked in `.nvmrc`)
- GPU with WebGPU support (Windows: D3D12; macOS: Metal) — see `resources/WebGPU-guide.md`

## Development

```bash
git clone --recurse-submodules <repo-url>
cd reze-design-desktop

npm install
npm run dev        # Start Electron + reze-design dev server
```

## Building

```bash
npm run dist                # Full build (staging + stripped scene + next build)
npm run dist -- --skip-build   # Reuse existing .next (stripping not applied, not recommended for releases)
```

- Windows output: `dist/RezeDesign-<version>-Setup.exe` (NSIS wizard)
- macOS output: `dist/RezeDesign-<version>.dmg` (unsigned, see `resources/MAC-install.md` for bypass)

### macOS Unsigned App Bypass (one-time)

The app is not Apple-signed, so Gatekeeper may block the first launch. Run this once in Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/Reze Design.app"
```

> You can also use `xattr -cr "/Applications/Reze Design.app"` to clear all extended attributes. If it says "app is damaged", the quarantine flag is inside the bundle — use the recursive version above.
> Other methods (right-click "Open", System Settings allow, etc.) are in `resources/MAC-install.md`.

Generate icons from `build/icon-source.jpg`:

```bash
npm run make-icon   # Outputs build/icon.ico, icon.png, icon.icns
```

## Project Structure

```
electron/            Electron main process & preload
scripts/             dev / dist / make-icon / after-pack
resources/           Documentation + stripped-release default scene
config.json          Online URL, update URL, port
reze-design/         Submodule (upstream reze-design)
```

## License

[AGPL-3.0-or-later](LICENSE)

## Acknowledgments

Thanks to [AmyangXYZ](https://github.com/AmyangXYZ/) for creating and maintaining the reze-engine MMD WebGPU renderer and related projects.
