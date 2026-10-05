# Exams Hub

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
- PDF/EPUB book uploads stored in an offline IndexedDB library on this device
- Responsive installable PWA shell with service-worker caching
- Sierra Leone coat-of-arms background watermark, bundled for offline use

The paper entries and questions are starter examples, not official or complete exam papers. Add verified curriculum and paper content before using this as a complete revision library.

## Coat of arms credit

The Sierra Leone coat of arms is by Yuma and contributors including Bluebear2, Rinaldum, S@m, and Zigeuner, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Sierra_Leone.svg), under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The artwork is used unchanged as a faint background watermark. The study hub is not an official government service and does not imply government endorsement.

The notes profile is local to one browser and device; it is not an online account and has no password recovery. Notes are encrypted with the passphrase, so forgetting it means they cannot be unlocked. General study progress remains local to the browser as well.

The Books page lets the first person on a device create a local admin passphrase, then upload, download, or remove PDF and EPUB books. Files stay in that browser's IndexedDB and are not uploaded to GitHub Pages or shared with other devices. Use a browser over localhost or HTTPS, and keep a separate copy of books you cannot replace.
