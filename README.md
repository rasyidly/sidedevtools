# SideDevTools — Privacy-First Chrome DevTools Sidebar Extension

> **100% Offline & Privacy-First Developer Companion**  
> A high-density Developer Tools sidebar built for Google Chrome, styled after the **Shopify Polaris Design System** with **Solar Icons (Bold Duotone)** and **Geist typography**. Designed to sit comfortably in Chrome's native side panel, offering essential day-to-day developer utilities directly in your browser without context switching or sending data to external servers.

[![Chrome Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Privacy: Offline](https://img.shields.io/badge/Privacy-100%25_Offline-10B981?logo=shield&logoColor=white)](#-privacy--security)

## Why SideDevTools?

- **100% Client-Side & Private** — Everything runs in your local browser sandbox. No analytics, no tracking, and zero remote server roundtrips.
- **Always Within Reach** — Docks neatly into Chrome's side panel (left or right). Open it with a single shortcut: `Ctrl+Shift+S` (`Cmd+Shift+S` on macOS).
- **Fast Navigation** — Press `/` anywhere to search tools instantly, filter by category or tags, and pin your favorites to the top.
- **Clean, Purpose-Built Design** — Crafted using Shopify Polaris design tokens, crisp Geist typography, and comfortable light/dark themes.

---

## Included Tools

### Security & Authentication

- **Password Generator & Vault**  
  Create cryptographically secure passwords with custom length, character filters, and entropy meters. Includes crack-time estimates and an offline local vault to save credentials with JSON backup export/import.

- **TOTP Authenticator & QR Scanner**  
  Generate two-factor authentication (2FA) verification codes with real-time countdowns. Add accounts by capturing a QR code with a drag-to-select region over the page, uploading an image, pasting from clipboard, or typing a secret key.

- **Hash & Checksum Generator**  
  Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes in real time, with an instant digest comparison check.

### Data Converters & Encoders

- **Encode & Decode Suite**  
  Encode and decode Base64 (UTF-8 and URL-safe), URL strings with query parameter breakdown, HTML entities, and binary/hex streams. Includes a live JSON Web Token (JWT) inspector with claims and expiration timestamps.

- **QR & Barcode Reader**  
  Decode QR, Data Matrix, Aztec, PDF417, Code 128/39/93, Codabar and EAN/UPC codes by dragging a box over part of the page, uploading an image, pasting, or dropping a file. Switch to Generate to build stylable QR codes for text, URLs, WiFi, contacts, email, SMS, phone, geo or OTP — with PNG/SVG download, image copy and payload copy.

- **Universal ID Generator**  
  Generate batch identifiers with custom prefixes, suffixes, and casing. Supports UUID v4, time-ordered UUID v7, ULID, NanoID, CUID2, and Unix timestamps.

- **HTTP Request Converter**  
  Translate API requests between cURL, JavaScript Fetch, Axios, Python Requests, Go, Rust, and Node.js.

- **Document to Markdown (AnyDoc)**  
  Convert Word (`.docx`), PDF, PowerPoint (`.pptx`), Excel (`.xlsx`), CSV, EPUB, and RTF files into GitHub-Flavored Markdown locally using WebAssembly.

### Web & Inspection Tools

- **Tab Storage & Session Manager**  
  Inspect, search, edit, and export `localStorage`, `sessionStorage`, and cookies for your current browser tab.

- **Meta Tags & OpenGraph Inspector**  
  Audit active page SEO titles, descriptions, and metadata. Preview live social cards for Google Search, Facebook OpenGraph, and X (Twitter).

- **JSON Formatter & Validator**  
  Prettify, minify, and validate JSON data with clear syntax error indicators and object metrics.

- **DateTime Parser & Formatter**  
  Convert timestamps and natural language dates across Unix epochs, ISO 8601, UTC, SQL strings, Excel numbers, and timezones.

### Design & Color

- **Color & Palette Toolkit**  
  Tailwind v4-first color workbench with OKLCH as the default output. Convert between HEX, RGB, HSL, HSV, OKLCH and OKLAB, then generate 50–950 ramps with configurable shade steps, hue shift, chroma curve and neutral pairing. Sample pixels with the OS EyeDropper or by dragging a box over part of the page, extract dominant palettes from any image with OKLab k-means, find the nearest named and Tailwind color, explore harmony sets, and audit WCAG 2.2 plus APCA contrast with pass/fail badges. Export Tailwind `@theme` blocks, CSS variables, JSON or hex lists — in OKLCH by default.

### Text & Data Utilities

- **Regex Playground**  
  Test regular expressions against a live highlighted sample, inspect every match with its numbered and named capture groups, read a plain-English explanation of each token (nested groups included), preview replacements, and start from a library of common patterns.

- **Form Filler & Auto-Recognize**  
  Optionally injects a gesture-driven filler into pages: focus any input and press **⌘ + double-click** to fill it with realistic data, or **⌘ + Shift + double-click** to fill the whole form. It auto-recognizes fields from `autocomplete`, input type, name, id, placeholder and label — email, phone, address, city, postal code, card number, CVV, password, dates, prices and 20+ more kinds, in English or Indonesian. Configure the modifier key, language, per-kind pattern overrides, "only fill empty fields", select menus, in-page confirmation, and pause specific sites. The content script is registered only while the feature is on.

### Media Utilities

- **AI Background Remover**  
  Remove photo and asset backgrounds in your browser using local machine learning. Just paste or drop an image to download a transparent PNG.

- **Favicon & App Icon Generator**  
  Convert any image into multi-resolution `favicon.ico`, Apple touch icons, Android PWA assets, a `site.webmanifest`, and a ready-to-use `.zip` download.

---

## Installation & Setup

### Install in Google Chrome

1. Clone or download this repository.
2. Build the extension:
    ```bash
    pnpm install
    pnpm build
    ```
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Turn on **Developer mode** in the top-right corner.
5. Click **Load unpacked** (top-left) and select the `dist` folder.
6. Click the extension icon or press `Cmd+Shift+S` (`Ctrl+Shift+S` on Windows) to open the sidebar.

> **Tip: Docking to the Left Side**  
> Prefer your tools on the left? Open Chrome **Settings** > **Appearance**, and under **Side panel**, select **"Show on left side"**.

### Local Development

To run SideDevTools in a browser tab with instant hot-reloading:

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:5173`.

---

## Credits & Dependencies

SideDevTools is made possible thanks to these open-source packages:

| Package                                     | Version       | Purpose                                                                    |
| :------------------------------------------ | :------------ | :------------------------------------------------------------------------- |
| **react** / **react-dom**                   | 19.2.8        | User interface components and DOM rendering                                |
| **typescript**                              | 6.0.2         | Type-safe application architecture                                         |
| **vite**                                    | 8.3.0         | Fast frontend build tool and dev server                                    |
| **tailwindcss**                             | 4.3.3         | Utility-first styling engine                                               |
| **@fontsource/geist-sans** / **geist-mono** | 5.3.0         | Modern interface and monospace typography                                  |
| **@solar-icons/react** / **solar-icon-set** | 2.3.3 / 2.0.1 | Interface icons                                                            |
| **lucide-react**                            | 1.59.0        | Auxiliary UI icons                                                         |
| **@imgly/background-removal**               | 1.7.0         | In-browser machine learning background removal                             |
| **onnxruntime-web**                         | 1.21.0        | WebAssembly ML model inference runtime                                     |
| **otpauth**                                 | 9.5.2         | TOTP / 2FA token generation and URI parsing                                |
| **@faker-js/faker**                         | 10.6.0        | Seeded generated data and locales for the Form Filler `{{pattern}}` engine |
| **qrcode**                                  | 1.5.4         | QR code rendering                                                          |
| **jsqr**                                    | 1.4.0         | QR code scanning from image canvas                                         |
| **jszip**                                   | 3.10.2        | In-memory ZIP archive generation for icon bundles                          |
| **uuid**                                    | 14.0.3        | RFC UUID v4 and v7 generation                                              |
| **ulid**                                    | 3.0.2         | Lexicographically sortable unique identifier                               |
| **nanoid**                                  | 6.0.2         | Compact URL-friendly random ID generation                                  |
| **@paralleldrive/cuid2**                    | 3.3.0         | Collision-resistant secure distributed IDs                                 |
| **clsx** / **tailwind-merge**               | 2.1.1 / 3.7.0 | Safe conditional CSS class merging                                         |
| **oxlint**                                  | 1.81.0        | High-performance Rust-based linter                                         |

---

## Privacy & Security

SideDevTools is built on three core rules:

- **No Analytics**: No tracking pixels, remote telemetry, or user analytics.
- **Local Processing**: All parsing, image processing, hash calculations, and AI inference happen directly on your CPU/GPU.
- **Your Data Stays on Your Machine**: Saved credentials and tokens are stored solely in your local browser storage (`localStorage` / `chrome.storage.local`).

### About the Form Filler content script

The Form Filler is the only feature that touches web pages, and it is strictly opt-in:

- Its content script is **registered programmatically only while you enable it**, and unregistered the moment you turn it off — no injection on any page otherwise.
- It never runs automatically: nothing happens until you perform the configured modifier + double-click gesture (or press the buttons in the side panel).
- It reads only the field you target (or the form you target), writing generated values locally, and can be paused per site.
- Generated data comes from the bundled on-device faker engine — no network calls, ever.

---

## Changelog

Release notes live in [changelog/](./changelog):

- [v1.3.0](./changelog/v1.3.0.md) — Color & Palette Toolkit, QR & Barcode Reader, Regex Playground, Form Filler, CSP-safe background remover.
- [v1.2.0](./changelog/v1.2.0.md) — first release with 13 offline developer tools.

---

## License

SideDevTools is an open-source project created and maintained by [rasyidly](https://github.com/rasyidly) (<rasyid@sekeco.id>).
