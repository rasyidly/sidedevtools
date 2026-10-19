# Privacy Policy for SideDevTools

**Last Updated:** October 19, 2026

**SideDevTools** ("we", "our", or "the extension") is developed by **rasyidly** (<rasyidly.my.id>). We are deeply committed to protecting your privacy. This Privacy Policy outlines our principles regarding data collection, usage, and storage.

---

## 1. Core Principle: 100% Client-Side & Zero Tracking

SideDevTools is built with a strict **Privacy-First** ethos:

- **No Remote Data Transmission:** We do **NOT** operate remote collection servers, databases, or analytics endpoints. Your inputs, generated secrets, and data never leave your computer.
- **No Tracking or Telemetry:** The extension contains no analytics trackers, tracking pixels, cookies, behavioral beacons, or advertising identifiers.
- **No Sale of Data:** We do not collect, monetize, transfer, or sell your personal or technical data to any third party under any circumstances.

---

## 2. Information Handled & How It Is Processed

All operations run locally within your browser sandbox:

1. **Passwords, 2FA Secrets & Local Vault:**
    - Password generation and entropy calculation use the local `window.crypto` API.
    - Credentials saved in the local vault or TOTP authenticator are stored strictly on your device using `chrome.storage.local` and browser `localStorage`.
    - Data can be exported or imported as JSON files solely by explicit user action.

2. **In-Browser Image Processing (AI Background Removal):**
    - Background removal neural networks run locally via WebAssembly and WebGL (`@imgly/background-removal` and `onnxruntime-web`).
    - Photos pasted or uploaded into the tool are processed exclusively on your device's memory and are never transmitted across the network.

3. **Document Conversion (AnyDoc Markdown):**
    - Office documents (DOCX, PDF, PPTX, XLSX, etc.) are converted into Markdown locally using client-side WebAssembly. No cloud converters or third-party APIs are called.

4. **Active Tab Inspection (Meta Tags & Storage Manager):**
    - When you explicitly click "Inspect Tab", the extension reads metadata or storage (`localStorage`, `sessionStorage`, cookies) of the active tab strictly to display it to you in the sidebar. This inspection data is discarded when you close or refresh the panel and is never logged externally.

---

## 3. Chrome Permissions Usage

SideDevTools requests only the permissions necessary to provide its features:

- **`sidePanel`**: Allows the extension to display its developer tools interface in Chrome's native sidebar.
- **`storage`**: Used to save your UI preferences (dark/light theme, pinned favorite tools) and local vault items on your device.
- **`activeTab` & `tabs`**: Used only when you trigger an action to inspect the current tab's meta tags or view tab storage keys.
- **`scripting`**: Executes a localized script solely upon user request to read on-page meta tags or session storage of the active webpage.
- **`clipboardRead`**: Allows pasting images directly into the AI Background Remover or QR Scanner without manual file selection.
- **`clipboardWrite`**: Allows one-click copying of generated passwords, tokens, hashes, and converted code snippets.
- **Host Permissions (`<all_urls>`)**: Required to allow the Meta Inspector and Tab Storage Manager to function across whatever local or remote website you are actively inspecting.

---

## 4. Third-Party Services & Remote Code

- The extension does **NOT** load or execute any remote scripts (`eval`, remote CDNs, or external code injections).
- All libraries, styles, and WebAssembly binaries are bundled directly within the extension package verified by Chrome's review system.

---

## 5. Changes to This Policy

If we update this Privacy Policy to reflect changes in our practices or extension features, the revised date at the top will be updated. Because we do not collect email addresses or user accounts, we recommend reviewing this policy periodically on GitHub.

---

## 6. Contact Us

If you have any questions, feedback, or concerns regarding this Privacy Policy or SideDevTools, please contact:

- **Developer:** rasyidly
- **Email:** <rasyid@sekeco.id>
- **Project Repository:** [https://github.com/rasyidly/sidedevtools](https://github.com/rasyidly/sidedevtools)
