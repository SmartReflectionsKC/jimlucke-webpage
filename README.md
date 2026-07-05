# Jim Lucke - Personal Website

A modern static website built with Vite, React, TypeScript, and Tailwind CSS.

## Getting Started Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Editing Content

All text content, project data, focus areas, and links are stored in a single configuration file for easy editing:
- `src/data/siteContent.ts`

## Managing Images

Images are stored in the `public/images/` directory (which will be served at `/images/...` in the browser).
- Photography images go in: `public/images/photography/`
- Profile picture: `public/images/jim-lucke.jpg`

*Note: The site is designed to degrade gracefully. If an image is missing, a fallback gradient will be displayed automatically.*

## How to Build

To generate the production-ready static files:
```bash
npm run build
```
This will create a `dist` folder containing `index.html` and the `assets/` folder.

## Deployment

### Manual Deployment (e.g., Hostinger)

1. Run `npm run build` locally.
2. Log into your Hostinger control panel (or connect via FTP).
3. Open the File Manager and navigate to your `public_html` directory for `jimlucke.com`.
4. Upload all contents **inside** the generated `dist` folder (not the folder itself) into `public_html`.
5. *Note on Caching: After uploading, you may need to clear your Hostinger cache (often via a 'Flush Cache' button in the dashboard) or do a hard refresh in your browser (Ctrl + F5 / Cmd + Shift + R).*

### Automated Deployment (GitHub to Hostinger)

Hostinger supports automatic deployment from GitHub:
1. Push this repository to a GitHub account.
2. In Hostinger, go to Advanced -> GIT.
3. Connect your repository.
4. Set the deployment branch (usually `main`).
5. Ensure Hostinger runs the build script (`npm run build`) and publishes the `dist` folder, OR build it via GitHub Actions and push the `dist` contents to a deployment branch. 
*(Consult Hostinger's documentation for specific Auto-Deployment settings for Node.js/Vite apps).*

## Technologies Used

- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4)
- **Icons:** Lucide React
- **Animations:** Motion (Framer Motion)
