# Fieldnotes Study Hub

An installable, offline-capable study hub for WAEC, NPSE, and BECE. It runs without a build step or third-party packages.

## Run locally

Open this folder in VS Code and start the included local server from the project root:

```powershell
node .\server.mjs
```

Then open `http://localhost:8000`. The service worker and install prompt require `localhost` or HTTPS. Load the app once so the app shell is cached; after that, the dashboard, bundled sample questions, notes, and saved progress work offline. Progress and notes are stored in this browser on this device.

## Included

- WAEC, NPSE, and BECE subject selectors with starter subject lists
- Interactive mixed-subject quiz with immediate feedback
- Sample past-paper index with local review tracking
- Notes saved in local storage
- Notes protected by a device-local passphrase and encrypted at rest with Web Crypto
- Responsive installable PWA shell with service-worker caching

The paper entries and questions are starter examples, not official or complete exam papers. Add verified curriculum and paper content before using this as a complete revision library.

The notes profile is local to one browser and device; it is not an online account and has no password recovery. Notes are encrypted with the passphrase, so forgetting it means they cannot be unlocked. General study progress remains local to the browser as well.
