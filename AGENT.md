# AGENT.md — CODEX

## Agent Context

You are running as **GPT-5.1-CODEX** inside the **OpenAI CODEX CLI**.

- You are **sandboxed** and have **no network connectivity** yourself.  
- If the project requires Node modules or tools that are not available, you **must explicitly tell the user which commands to run** (e.g., `npm install ...`) so they can execute them in their own environment.  
- You never run `npm install` or other networked commands yourself; you only **instruct**.

---

## Project

**Name:** QR Crafter  
**Type:** Node.js + React web app  
**Goal:** A small web tool to generate branded QR codes with a polished UI, multiple visual styles, logo upload, live preview, URL input, color selection, optional text label, and export to JPEG, PNG, SVG, and WEBP (with transparency where applicable).

You (the agent) help design, implement, and maintain this project.

---

## Development Workflow

You must follow this workflow whenever you modify the repository.

1. **Plan the change**
   - Briefly reason about what you’re going to do.  
   - Keep each change set reasonably small and focused (e.g., “init project,” “add QR preview component,” “wire up downloads”).

2. **Make the change**
   - Create or edit files as needed.  
   - Keep functions cohesive and well-documented with comments where non-obvious.

3. **Run checks (if available)**
   - Instruct the user to run relevant commands, for example:
     - `npm test`
     - `npm run lint`
     - `npm run build`
   - If these scripts do not exist yet, either create them or state that they are not yet configured.

4. **Git add & commit after each logical change**
   - After completing a coherent piece of work (even small ones), you **must** instruct the user to run:
     - `git add <files>` (or `git add .` when appropriate)  
     - `git commit -m "<short, relevant message>"`
   - Use clear, descriptive commit messages like:
     - `chore: initialize node and react project`
     - `feat: add qr preview and style controls`
     - `feat: implement png jpeg svg webp downloads`
     - `docs: add detailed readme`
   - Never skip this step; every meaningful change should end with a commit instruction.

5. **Do not push**
   - You do **not** run `git push`.  Pushing is left to the user.

---

## Technical Stack

### Runtime & Tooling

- **Node.js:** LTS version (recommend >= 18.x; 20.x if available).  
- **Package manager:** npm (default), though yarn/pnpm are acceptable if the repo is already set up that way.  
- **Build tooling (frontend):** Vite + React (TypeScript preferred).

If any of these are missing, instruct the user to install them.  Example:

> Please install Node.js (LTS) from nodejs.org and then run:  
> `npm install` in the project root.

### Key Dependencies (suggested)

You must list required installs when you introduce them.  Likely dependencies:

**Core frontend:**
- `react`
- `react-dom`
- `vite`
- `@vitejs/plugin-react-swc` (or equivalent React plugin)
- `typescript` + `ts-node` (if using TS)
- `tailwindcss` + `postcss` + `autoprefixer` (for styling, optional but recommended)

**Backend:**
- `express` (for simple Node backend / static file serving)
- `cors` (if needed)
- `morgan` (optional logging)

**QR generation / rendering (pick a strategy and stick to it):**
- A QR generator library, for example:
  - `qrcode` (Node + browser, gives canvas/SVG or raw data)
  - or another matrix-level library that lets you draw custom shapes.

If you choose a library, you **must** tell the user to install it, e.g.:

> Run: `npm install express qrcode react react-dom vite @vitejs/plugin-react-swc`

Dev dependencies should likewise be explicitly listed when added.

---

## Features & Requirements

### 1. Pretty, minimal interface

- Clean, modern, responsive layout.  
- Single-page UI with:
  - A **controls panel** (left/top on small screens)  
  - A **preview panel** (right/bottom on small screens)  
- Light theme by default; ensure good contrast.

### 2. QR content (URL)

- Main input: **URL** text field.  
- Validate on the client:
  - If invalid or empty, show a gentle warning and disable downloads.

### 3. QR styles (module shapes)

Provide a clear UI (dropdown, pills, or segmented control) for these styles:

1. **Classic** – square modules  
2. **Rounded** – squares with rounded corners  
3. **Dots** – circular modules  
4. **Pills** – rounded rectangles / bars  
5. **Outline** – thinner stroke-style modules with more white space  

Implementation:

- Use the underlying QR matrix from a library.  
- Draw onto `<canvas>` or build `<svg>` paths according to selected style.  
- Keep the rendering logic in a dedicated module (e.g., `src/frontend/lib/qrRenderer.ts`).

### 4. Color options

- Foreground color picker (modules).  
- Background color picker.  
- Checkbox: **Transparent background** (applies to PNG, WEBP, SVG where supported).  
- Show a warning if the contrast between foreground and background is too low for scannability.

### 5. Logo upload

- Let the user upload an image file (PNG, JPEG, SVG, WEBP if supported by browser).  
- Enforce:
  - File type whitelist.  
  - Reasonable size limit (e.g., 2–5 MB).  
- Display a small preview beside or under the controls.  
- Render the logo centered within the QR code.  
- Provide:
  - Logo size slider (percentage of QR canvas size).  
  - Toggle to enable a white “safe zone” behind the logo (a white rounded rectangle or circle).

All logo handling should be client-side; do not persist or upload user images to any server.

### 6. Optional text label

- Text input for a caption that appears **under** the QR code in the preview.  
- Include basic options:
  - Font size (small / medium / large).  
  - Weight (regular / bold).  
  - Text alignment (center default).  
- The label should be part of the exported image where technically reasonable:
  - For canvas-based exports, draw the label text under the QR.  
  - For SVG, include the label as `<text>` under the main `<g>`.

### 7. Live preview

- As the user edits:
  - URL  
  - Style  
  - Colors  
  - Logo  
  - Label  
- The preview should update automatically (with debouncing for URL changes if needed).  
- Show a small loading indicator if a rerender takes noticeable time.

### 8. Downloads

Provide buttons for:

- **Download JPEG**  
- **Download PNG**  
- **Download SVG**  
- **Download WEBP**

Behavior:

- For **PNG**, **SVG**, **WEBP**:
  - If “Transparent background” is enabled, output true transparency.  
- For **JPEG**:
  - Always use a solid background color; if transparency was selected, warn the user that JPEG does not support it.
- Filenames should be human-readable, e.g.:

  `qr-crafter-<style>-YYYYMMDD-HHmmss.png`

Use `<a download>` with a Blob or data URL to trigger downloads.

### 9. Error Correction & Scannability

- Use high error correction (e.g., level **H**) when a logo is present.  
- Maintain a quiet zone around the QR code.  
- If a combination of huge logo, extreme colors, or unusual styles likely makes the code unscannable, show a non-blocking warning.

---

## Architecture & File Layout (Suggested)

You may adapt this to an existing structure, but keep similar separations.

- `package.json`
- `README.md`
- `vite.config.(ts|js)`
- `tailwind.config.(ts|js)` (if using Tailwind)
- `postcss.config.(cjs|js)` (if using Tailwind)
- `/src`
  - `/backend`
    - `server.(ts|js)` — Express app to serve the built frontend (and optional API routes if needed).
  - `/frontend`
    - `main.(tsx|jsx)` — React entry point.  
    - `App.(tsx|jsx)` — main layout.  
    - `/components`
      - `ControlsPanel.(tsx|jsx)`  
      - `QrPreview.(tsx|jsx)`  
      - `LogoUploader.(tsx|jsx)`  
      - `DownloadButtons.(tsx|jsx)`  
    - `/lib`
      - `qrRenderer.(ts|js)` — QR matrix + drawing logic.  
- `/public`
  - `index.html`

Whenever you create or significantly change any of these files, remember to end by instructing:

```bash
git add <changed files>
git commit -m "<descriptive message>"
````

---

## README.md Requirements

You must create and maintain a **detailed** `README.md` in the project root that includes:

1. **Project overview** and feature summary.
2. **Prerequisites:**

   * Node.js version
   * Git (optional but typical)
3. **Installation steps:**

   * Cloning the repo (if appropriate).
   * Running `npm install` and any other one-time setup.
4. **Development usage:**

   * Commands to start the dev server (e.g., `npm run dev`).
   * Any backend server commands if separate.
5. **Build & production:**

   * `npm run build` and how to serve the built app (`npm run preview` or Node server).
6. **Usage instructions:**

   * How to enter a URL, choose styles, change colors, upload a logo, add a label, and download images.
7. **Notes about limitations:**

   * JPEG background behavior, transparency notes.
   * Browser support caveats if any.
8. **Contribution / development notes:**

   * The requirement to `git add` and `git commit` after each logical change.

Any time you add, remove, or significantly modify a feature, you should also update `README.md` accordingly and commit the changes.

---

## Example User Flow

1. User opens the app.
2. Enters a URL.
3. Chooses a QR style (e.g., **Dots**).
4. Adjusts foreground/background colors and, if desired, enables transparent background.
5. Uploads a logo, tweaks its size, and optionally turns on a white safe zone.
6. Adds an optional label under the QR code.
7. Watches the live preview update.
8. Clicks one of the download buttons to save the QR in the chosen format.

---

## Acceptance Criteria

The project is successful when:

* [ ] The app loads and immediately shows a default QR code preview.
* [ ] The user can enter a URL and see the QR update.
* [ ] All style options (Classic, Rounded, Dots, Pills, Outline) visibly affect the QR modules.
* [ ] Foreground/background colors and the transparent background option work as intended.
* [ ] Logo upload, sizing, and safe zone behave correctly and preserve scannability under normal conditions.
* [ ] An optional label appears under the QR code and is included in exported formats where appropriate.
* [ ] Download buttons produce JPEG, PNG, SVG, and WEBP outputs with correct filenames, transparency rules, and label inclusion.
* [ ] The UI is visually pleasant, responsive, and accessible.
* [ ] The repository contains a detailed, up-to-date `README.md`.
* [ ] Each logical development step ends with a `git add` + `git commit` instruction and has a meaningful commit message.

---

## Things To Avoid

* Do **not** rely on external network calls from the running app unless strictly necessary and clearly documented.
* Do **not** skip commit instructions after changes.
* Do **not** tightly couple QR matrix generation with UI; keep rendering logic modular for future extension.

---

## Future Enhancements (Optional)

These are **not required** but may be considered later:

* Preset themes (e.g., “Minimal,” “Retro,” “Cyber”).
* Multiple content types (Wi-Fi config, plain text, vCard).
* Import/export of design presets as JSON.
* Batch generation from a CSV or list of URLs.

````

---

And here’s a `README.md` you can use as a starting point:

```markdown
# QR Crafter

A small Node.js + React web app for creating **beautiful, branded QR codes** with:

- Multiple visual styles (classic, rounded, dots, pills, outline)  
- Custom colors and optional transparent backgrounds  
- Logo upload and sizing, with an optional safe-zone behind the logo  
- Optional text label under the QR code  
- Live preview  
- Downloads in **JPEG, PNG, SVG, and WEBP** formats  

---

## Features

- **Pretty interface**  
  Clean, minimal, and responsive single-page UI.

- **URL-based QR generation**  
  Enter a URL, and the QR updates instantly.

- **QR styles**
  - Classic (square modules)  
  - Rounded (soft squares)  
  - Dots (circle modules)  
  - Pills (rounded rectangles / bars)  
  - Outline (thin stroke-like modules with more white space)

- **Color controls**
  - Foreground and background color pickers  
  - Optional transparent background (for PNG, WEBP, SVG)

- **Logo upload**
  - Upload PNG/JPEG/SVG/WEBP (depending on browser support)  
  - Adjustable logo size (relative to QR code)  
  - Optional white safe-zone behind the logo

- **Text label**
  - Optional caption rendered under the QR code  
  - Simple controls for size and weight

- **Downloads**
  - Export current QR design as:
    - JPEG (opaque background only)  
    - PNG (supports transparency)  
    - SVG (vector, supports transparency)  
    - WEBP (supports transparency)  
  - Filenames include timestamp and style

---

## Prerequisites

- **Node.js**: LTS (recommended: ≥ 18.x; works best with 18.x or 20.x)  
- **npm**: Comes with Node.js  
- **Git** (recommended for version control)

To check your versions:

```bash
node -v
npm -v
git --version
````

---

## Installation

1. **Clone the repository** (or create it and add these files):

```bash
git clone <your-repo-url> qr-crafter
cd qr-crafter
```

2. **Install dependencies**

> Note: The CODEX agent is sandboxed and cannot install dependencies itself.
> Run this command on your own machine:

```bash
npm install
```

If a fresh `package.json` has not yet been created by CODEX, one will need to be added first.  The agent will specify any additional dependencies as they are introduced (for example `express`, `react`, `vite`, `qrcode`, `tailwindcss`, etc.), and you should re-run `npm install` after updates.

---

## Development

Start the development server (exact command may differ slightly depending on the final setup; this is the recommended default):

```bash
npm run dev
```

Then open the printed URL (typically `http://localhost:5173` for Vite) in your browser.

If a simple Node backend is used for serving the production build, you may also have:

```bash
npm run dev:server   # (optional) runs the Express server in dev mode
```

The CODEX agent will document any such scripts in `package.json` and update this README accordingly.

---

## Build & Production

To create a production build of the frontend:

```bash
npm run build
```

To preview the production build with Vite:

```bash
npm run preview
```

If a separate Node/Express server is included, the typical flow is:

1. Run `npm run build` to create the frontend bundle.
2. Start the server (for example):

   ```bash
   npm start
   ```

   The server will serve the built assets.

The exact script names will be kept in sync with `package.json` by the CODEX agent.

---

## Usage

1. **Open the app** in your browser.
2. **Enter a URL** in the main input field.

   * The QR preview should update automatically.
3. **Choose a style** from the style selector:

   * Classic, Rounded, Dots, Pills, Outline
4. **Set colors**:

   * Adjust foreground and background using the color pickers.
   * Optionally enable “Transparent background” (works for PNG/WEBP/SVG).
5. **Upload a logo** (optional):

   * Click the logo upload control and select an image.
   * Adjust the size slider to control how big the logo appears in the center.
   * Toggle the safe-zone option to place a white area behind the logo for better readability.
6. **Add a text label** (optional):

   * Enter text in the label field.
   * Use the simple sizing/weight controls if available.
7. **Review the live preview** and tweak settings until satisfied.
8. **Download the QR code**:

   * Click one of the download buttons (JPEG/PNG/SVG/WEBP).
   * The file will be generated and downloaded with a descriptive name.

---

## Transparency & Format Notes

* **PNG / WEBP / SVG**

  * Support transparent backgrounds.
  * If “Transparent background” is enabled, the exported image respects transparency.

* **JPEG**

  * JPEG does **not** support transparency.
  * Even if “Transparent background” is enabled, JPEG exports use a solid background color (the configured background color).

---

## Accessibility & Scannability

To keep QR codes scannable:

* Use high contrast between foreground and background.
* Avoid extremely light foreground colors.
* When using a logo:

  * Keep the logo reasonably small.
  * Use the safe-zone option to preserve the QR pattern around it.
* The app aims to use a high error-correction level when a logo is present.

---

## Git Workflow

When developing with the CODEX agent:

1. Make a small, focused change (e.g., add a component, adjust styles, update docs).

2. Run tests/build as appropriate:

   ```bash
   npm test        # if tests exist
   npm run lint    # if linting is configured
   npm run build   # sanity-check builds
   ```

3. Stage and commit your changes:

```bash
git add <changed-files>
git commit -m "<descriptive message>"
```

Examples:

* `chore: initialize project structure`
* `feat: add qr style selector and preview`
* `feat: implement png jpeg svg webp export`
* `docs: update readme with installation steps`

The CODEX agent is instructed to **always** end each logical change with a `git add` / `git commit` instruction.

---

## Troubleshooting

* **Nothing happens when I run `npm run dev`**

  * Ensure dependencies are installed: `npm install`.
  * Check that Node.js is a supported version (LTS).

* **QR codes not scanning reliably**

  * Try:

    * Increasing contrast between foreground and background.
    * Reducing logo size.
    * Disabling extreme styles or outline modes.
    * Turning on the logo safe-zone.

* **Downloads not working**

  * Make sure you are using a modern browser (recent Chrome, Firefox, Safari, or Edge).
  * Check the browser console for errors and fix any reported issues.

---

## License

Add licensing information here (e.g., MIT, proprietary, etc.), depending on your project’s needs.
