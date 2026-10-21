# GitHub Pages deployment

This folder is ready to publish as a static GitHub Pages project. No build step or npm installation is required.

1. Upload this folder's contents to a GitHub repository root. Keep `assets/` as a folder. `index.html` must be at the repository root.
2. Open **Settings > Pages** in the repository.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select **main** and **/ (root)**, then click **Save**.
5. Wait for deployment and open the URL shown there: `https://USERNAME.github.io/REPOSITORY/`.

Local resource paths, the manifest start URL, and service worker are relative to the repository path. Hash navigation works without a 404 redirect. `.nojekyll` disables Jekyll processing.

## Verification

- Open Map and confirm the bundled map appears.
- Open Advanced Mode > Ranger Workspace and use the existing demo passcode `1234`.
- After OFFLINE READY appears, core local files are cached for offline demonstration.
- The two original YAC banner images in Advanced Mode still require internet access.

This remains a student prototype. Trip records are saved in the current browser; GitHub Pages does not provide shared storage or server-side authentication. The demo passcode is not production access control.

## Updating

Upload changed files to `main`; Pages deploys again. When changing cached files, increment the version suffix in `CACHE_NAME` in `sw.js` so offline copies refresh.
