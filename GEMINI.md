# Van Oude Dingen - Hybrid PWA & TWA

This project is a hybrid vintage furniture and accessories showcase, combining a Progressive Web App (PWA) with an Android Trusted Web Activity (TWA) wrapper. It pulls content from the `vanoudedingen.nl` WordPress REST API.

## Project Overview

- **Architecture:** 
    - **PWA:** Located in `/bestanden/pwa/`. Built with HTML5, CSS3, and Vanilla JavaScript.
    - **Android TWA:** Located in `/app/`. A native Android wrapper using `androidx.browser:browser` and `androidbrowserhelper`.
    - **Hosting:** Firebase Hosting (`vanoudedingen-bca6c.web.app`).
    - **CI/CD:** GitHub Actions for automated deployment.
- **Key Features:**
    - Custom **Smart Masonry** layout for balanced tile distribution.
    - **Lean Loading:** Fetches initial 24 items with `_embed`, then silent background loading for performance.
    - **Advanced Lightbox:** Parallel API fetching, gallery parsing from content, and mobile swipe navigation.
    - **Offline Support:** Custom Service Worker (`sw.js`) with specific caching for API (1h) and images (24h).
    - **CORS Bypass:** Utilizes embedded media and native image tags to handle cross-origin WordPress assets.

## Building and Running

### PWA Development
- Development files are in `bestanden/pwa`.
- Test locally by serving the folder or via Firebase:
  ```powershell
  firebase serve
  ```

### Android TWA
- Open the root directory in Android Studio.
- Build the Release Bundle/APK:
  ```powershell
  ./gradlew assembleRelease
  ```
- **Signing:** Uses `my-release-key.jks` in the project root (Password: `VanOudeDingen2026`).

### Deployment
The project uses a custom deployment skill script:
- **Manual (Git Bash):**
  ```bash
  ./scripts/deploy.sh [patch|minor|major|rollback]
  ```
- **Automated:** Pushing to the `main` branch or creating a tag (`v*`) triggers GitHub Actions.

## Development Conventions

- **Versioning:** Semantic versioning managed in the `VERSION` file. The `deploy.sh` script automatically increments this and syncs it with `manifest.json` and the PWA menu.
- **Changelog:** Release notes are automatically appended to `CHANGELOG.md` during deployment.
- **Branding:** 
    - **Fonts:** "Special Elite" (Header/Logo), "Lora" (Serif), "Jost" (Sans-serif).
    - **Header:** "VAN OUDE DINGEN," with the subtitle "de mensen die voorbij gaan...".
- **Git Strategy:** 
    - Branch: `main`.
    - Automated tagging and release creation via GitHub Actions.
- **CORS/Image Strategy:** Always use `_embed=1` in API calls to avoid extra media fetches. Use standard `<img>` tags without `crossorigin` attributes to support opaque responses from the WordPress server.

---

## **Sessie Context (09 maart 2026)**

**Huidige Versie:** De PWA draait momenteel op `v1.1.6`. Dit is geverifieerd via deploymentlogs en zou nu zichtbaar moeten zijn in het menu (na een grondige cache-clear).

**Onopgelost Probleem:** Het oneindig scrollen (lazy loading) werkt **niet** voor *alle* categorieën. Er worden consistent slechts 6 tegels geladen, zelfs wanneer de WordPress API aangeeft dat er veel meer pagina's (`totalPages`) beschikbaar zijn.

**Diagnose tot nu toe:**
*   De WordPress API levert correcte `totalPages` waarden (bijv. 194 voor "Alles"). Het probleem zit dus niet in de API-respons zelf.
*   De `scrollObserver` (die `loadNextPage()` zou moeten triggeren) wordt niet correct geactiveerd, waardoor er geen verdere items worden geladen.
*   De `loadMoreTrigger` (een onzichtbaar element onderaan de grid dat door de `scrollObserver` wordt gemonitord) was eerst verborgen met `visibility: hidden;`. Dit is in `v1.1.6` aangepast naar `opacity: 0; pointer-events: none; z-index: -1;` in een poging dit te verhelpen, maar zonder succes.
*   Er is een sterk vermoeden dat een **fundamenteel probleem in de JavaScript-logica of de CSS-layout** de `IntersectionObserver` verhindert om correct te functioneren. Dit kan gerelateerd zijn aan de `tile-grid` zelf, de scroll-container, of de algemene document flow.
*   Hardnekkige Service Worker caching heeft het debuggen bemoeilijkt, maar zou nu verholpen moeten zijn met `v1.1.6` (dankzij `self.skipWaiting()` en `self.clients.claim()`).

**Voor de volgende sessie:** Focus op het diagnosticeren van het niet-functionerende oneindig scrollen. Inspecteer de `IntersectionObserver` in de Developer Tools om te zien waarom deze niet triggert, en controleer de CSS van de `tile-grid`, de `loadMoreTrigger` en de scroll-container.