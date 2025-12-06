# QR Crafter

Create **polished, branded QR codes** with multiple visual styles, logo upload, safe-zone controls, live preview, optional labels, and downloads in JPEG/PNG/SVG/WEBP formats. The project uses **React + Vite + TypeScript** on the frontend with plenty of room for a lightweight Node/Express backend later if desired.

> ⚠️ The CODEX agent cannot install or download dependencies. Follow the instructions below on your own machine when new packages are introduced.

---

## Features

- Minimal, responsive interface with a controls panel and real-time preview panel.
- URL-driven QR generation with validation and auto high error correction when logos are present.
- Style selector: **Classic**, **Rounded**, **Dots**, **Pills**, **Outline** rendered through a custom drawing pipeline.
- Foreground/background color pickers with contrast warnings plus a transparent background toggle (PNG/WEBP/SVG only).
- Client-side logo upload (PNG/JPEG/WEBP/SVG, ≤ 4 MB) with a size slider and optional white safe zone.
- Optional label beneath the QR code (multi-line, adjustable size/weight/alignment) included in preview and exports.
- Live preview that updates instantly and surfaces warnings when scannability might degrade.
- Download buttons for **JPEG**, **PNG**, **SVG**, and **WEBP** with timestamped filenames and transparency handling.

---

## Prerequisites

- **Node.js**: LTS release (≥ 18.x recommended; 20.x works great).
- **npm**: Bundled with Node.
- **Git**: Optional but recommended for version control.

Check your versions:

```bash
node -v
npm -v
git --version
```

---

## Installation

Clone the repository (or copy it into an existing workspace):

```bash
git clone <your-repo-url> qr-crafter
cd qr-crafter
```

Install dependencies locally (rerun whenever `package.json` changes):

```bash
npm install
```

Current dependencies include:

```bash
npm install react react-dom qrcode
npm install -D typescript vite @vitejs/plugin-react-swc @types/react @types/react-dom
```

---

## Development

Start the Vite dev server:

```bash
npm run dev
```

Then open the printed URL (usually `http://localhost:5173`). The UI already shows the fully wired controls + preview + download workflow.

---

## Build & Preview

Create a production build:

```bash
npm run build
```

Preview the built assets with Vite:

```bash
npm run preview
```

If/when an Express backend is added to serve the compiled frontend, document the new scripts here as well.

---

## Usage Workflow

1. Launch the dev server and open the app.
2. Enter the destination URL. The preview validates it and only enables downloads for valid URLs.
3. Choose a QR style (Classic, Rounded, Dots, Pills, Outline).
4. Pick foreground/background colors and optionally enable a transparent background.
5. Upload a brand logo (PNG/JPEG/WEBP/SVG up to 4 MB). Adjust the size slider and toggle the white safe zone for better scannability.
6. Add an optional label, selecting its size, weight, and alignment.
7. Watch the preview update automatically and review any warnings.
8. Download the QR as JPEG, PNG, SVG, or WEBP. Transparency applies to PNG/WEBP/SVG; JPEG always uses a solid background.

---

## Transparency Notes

- **PNG / WEBP / SVG**: Respect the transparent background toggle.
- **JPEG**: Cannot be transparent. If transparency is enabled, the export automatically falls back to the configured background color and the UI shows a warning.

---

## Accessibility & Scannability Tips

- Keep strong contrast between foreground and background (the UI warns when ratios drop below ~3:1 on opaque designs).
- Use a white safe-zone under logos to preserve the QR pattern.
- Avoid huge logos or extreme style choices that remove too many modules; warnings highlight risky combos but don't block you.

---

## Git Workflow

After finishing each focused change:

```bash
git add <affected-files>
git commit -m "<short, descriptive message>"
```

Example commit messages:

- `chore: initialize vite react scaffold`
- `feat: add qr renderer module`
- `feat: hook up downloads`
- `docs: expand usage instructions`

Never skip this step when collaborating with the CODEX agent.

---

## License

Specify your preferred license here (MIT, proprietary, etc.).
