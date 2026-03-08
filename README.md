# VanOudeDingen PWA & TWA Setup

This project combines a Progressive Web App (PWA) with an Android Trusted Web Activity (TWA) wrapper, hosted on Firebase with an automated GitHub Actions deployment pipeline.

## Project Structure

- `/bestanden/pwa/`: Core PWA files (HTML, CSS, JS, manifest, service worker).
- `/app/`: Android Studio project files (TWA wrapper).
- `firebase.json`: Firebase Hosting configuration (public folder, cache headers, rewrites).
- `.github/workflows/deploy.yml`: CI/CD pipeline for automated deployments.

## Deployment Pipeline

The deployment process is automated using GitHub Actions:

1.  **Push to `main`**: Automatically deploys the PWA to the live Firebase Hosting site.
2.  **Pull Request**: Automatically creates a preview deployment and posts the URL as a comment.

### Manual Deployment
You can manually deploy using the Firebase CLI:
```bash
firebase deploy --only hosting
```

## Initial Setup & CI/CD Token

To enable the GitHub Actions pipeline, you need to add a `FIREBASE_TOKEN` to your GitHub repository secrets:

1.  **Generate a CI token**:
    ```bash
    firebase login:ci
    ```
    Follow the authentication steps in your browser.
2.  **Add to GitHub**:
    - Go to your GitHub repository.
    - Settings > Secrets and variables > Actions.
    - Click **New repository secret**.
    - Name: `FIREBASE_TOKEN`.
    - Value: Paste the token from step 1.

## TWA Domain Verification (assetlinks.json)

For the Android app to hide the URL bar (Trusted Web Activity mode), you must verify ownership of the domain:

1.  Sign your Android app to generate a release APK/AAB.
2.  Obtain the **SHA-256 fingerprint** of your signing certificate.
3.  Update `/bestanden/pwa/.well-known/assetlinks.json` with your package name and SHA-256 fingerprint.
4.  Push the changes. Once deployed, the Android app will verify the link and run in full-screen TWA mode.

## Workflow Diagram

```text
Gemini edits PWA files
      ↓
git push to main
      ↓
GitHub Actions (CI/CD)
      ↓
Firebase Hosting (Live)
      ↓
Android App (TWA) updated automatically
```

---
*Created as part of the initial PWA setup.*
