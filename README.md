# QR Crafter

Create **polished, branded QR codes** with multiple visual styles, logo upload, live preview, captions, and downloads in JPEG/PNG/SVG/WEBP formats. The project uses **React + Vite + TypeScript** on the frontend with plenty of room for a lightweight Node/Express backend later if desired.

> ⚠️ The CODEX agent cannot install or download dependencies. Follow the instructions below on your own machine.

---

## Features (planned & in-progress)

- Minimal, responsive interface with a controls panel and preview panel.
- URL-driven QR generation with validation and high error correction when logos are used.
- Style selector: Classic, Rounded, Dots, Pills, Outline.
- Color pickers with a transparent background toggle (PNG/WEBP/SVG only).
- Client-side logo upload with size + safe-zone controls (work-in-progress placeholder in UI).
- Optional text label beneath the QR code that is also included in exported assets.
- Live preview that updates as settings change, warning about risky combinations.
- Download buttons for **JPEG**, **PNG**, **SVG**, and **WEBP** with descriptive filenames.

The initial scaffold already provides the controls layout, state hooks, and basic styling so features can be implemented incrementally.

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

Install dependencies locally:

```bash
npm install
```

Current dependencies:

```bash
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react-swc @types/react @types/react-dom
```

Re-run `npm install` whenever `package.json` changes.

---

## Development

Start the Vite dev server:

```bash
npm run dev
```

Then open the printed URL (usually `http://localhost:5173`). The UI already shows the controls/preview shell so you can begin wiring up QR rendering, uploads, etc.

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
2. Enter the destination URL. The preview will validate and only enable downloads for valid URLs.
3. Choose a QR style (Classic, Rounded, Dots, Pills, Outline).
4. Pick foreground/background colors and optionally enable a transparent background.
5. Upload a brand logo (UI placeholder exists; rendering logic is the next milestone). Adjust logo size and toggle the white safe zone when implemented.
6. Add an optional label, selecting its size and weight.
7. Watch the preview update automatically.
8. Download the QR as JPEG, PNG, SVG, or WEBP. Transparency applies to PNG/WEBP/SVG; JPEG always uses a solid background.

---

## Transparency Notes

- **PNG / WEBP / SVG**: Respect the transparent background toggle.
- **JPEG**: Cannot be transparent; warn users when they try to export with transparency enabled.

---

## Accessibility & Scannability Tips

- Keep strong contrast between foreground and background. Provide inline warnings when the contrast ratio falls below ~4.5:1.
- Use a white safe-zone under logos to preserve the QR pattern.
- Avoid huge logos or extreme style choices that remove too many modules; warn but do not block.

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
