# Content Management Guide for JimLucke.com

Welcome! This guide explains how to write and publish new **Field Notes** and add **Photography Galleries** to your personal innovation portfolio without touching any code or React components.

---

## 1. Quick Overview

- **Field Notes**: Stored as individual Markdown (`.md`) files in `content/field-notes/`.
- **Photography Galleries**: Stored as clean JSON manifests in `content/photography/`.
- **Images**: Placed in `public/images/` (for example: `public/images/photography/`).
- **Template**: A reusable starter template is provided at `content/field-notes/_template.md`. (Files starting with `_` are permanently hidden from the site).

> [!NOTE]
> **Shareable Links & Social Media Previews**
> Every Field Note and Photography Gallery is directly shareable using its unique link (e.g., `https://jimlucke.com/?note=your-slug` or `https://jimlucke.com/?gallery=your-gallery`).
> In this single-page application (SPA) architecture, social media link unfurls (like iMessage, LinkedIn, or Twitter cards) will display the default site-wide preview image and title. Article-specific social preview cards can be added in a future phase via static prerendering.

---

## 2. Writing and Publishing Field Notes

You can use any text or Markdown editor you like (Obsidian, iA Writer, VS Code, Typora, Apple Notes, or GitHub's web interface).

### Step 1: Create a New File
Create a new file inside the `content/field-notes/` folder. Use lowercase letters and hyphens for the filename:
```
content/field-notes/my-new-article-title.md
```
The filename (without `.md`) becomes your shareable slug (`/?note=my-new-article-title`).

### Step 2: Add Frontmatter Metadata
Every post begins with a metadata block enclosed between two lines with three dashes `---`:

```yaml
---
title: "The Title of Your Field Note"
date: "2026-09-21"
summary: "A 1-2 sentence description that appears on the card and article preview."
category: "Practical Tech"
tags: ["Practical Tech", "Innovation"]
coverImage: "/images/photography/snow-light-dark.jpeg"
published: false
readTime: "4 min read"
externalLink: ""
---
```

### Frontmatter Fields Explained:
| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | Text | Headline of your post (required). |
| `date` | `YYYY-MM-DD` | Publication date (required). |
| `summary` | Text | 1–2 sentence overview for cards and reader introduction (required). |
| `category` | Text | E.g. `Practical Tech`, `Nonprofit Systems`, `Innovation Lab` (required). |
| `tags` | List | E.g. `["React", "Community", "Events"]` |
| `coverImage` | Path | Optional image path starting with `/images/...`. |
| `published` | Boolean | `false` for drafts, `true` for live articles (required). |
| `readTime` | Text | E.g. `"4 min read"`. |
| `externalLink` | URL | Optional external link. |

### Step 3: Write Your Article Content
Write standard Markdown below the second `---`:
```markdown
# Section Heading

Here is a paragraph discussing a practical problem.

## Subheading

- Key insight or bullet point
- Another point

> "A memorable quote or emphasis block."

You can link to external sites like [Corvette Club KC](https://corvetteclubkc.com), which will automatically open securely in a new tab.
```

### Step 4: Saving a Draft vs. Publishing
- **To keep as a Draft**: Set `published: false`.
  - While running locally (`npm run dev`), drafts are visible so you can preview them.
  - When building for production (`npm run build`), all drafts are automatically excluded.
- **To Publish Live**: Change `published: true`.

---

## 3. Adding a Photography Gallery

Each photo collection is defined by one simple JSON manifest in `content/photography/`.

### Step 1: Add Web-Ready Images
Add your optimized photos to `public/images/photography/` (or a subfolder such as `public/images/photography/route-66/`).

### Step 2: Create the Gallery Manifest
Create a file named `content/photography/<gallery-id>.json`. For example: `content/photography/route-66.json`:

```json
{
  "id": "route-66",
  "title": "Route 66 Neon & Asphalt",
  "description": "Mid-century neon signs, retro motels, and roadside relics along the mother road.",
  "date": "2026-09-15",
  "coverImage": "/images/photography/abandon-house.jpeg",
  "displayOrder": 7,
  "published": true,
  "images": [
    {
      "src": "/images/photography/abandon-house.jpeg",
      "alt": "Vintage illuminated neon sign of a motor lodge at dusk",
      "caption": "Restored neon lighting glowing against the evening sky."
    }
  ]
}
```

### Manifest Fields Explained:
- `id`: Must match the filename without `.json` (e.g. `route-66`).
- `displayOrder`: Number specifying where it appears in the gallery grid (1, 2, 3...).
- `published`: `true` to display, `false` to hide.
- `alt`: **Required** accessible description for screen readers and search engines.
- `caption`: Optional descriptive text displayed below the photo in the full viewer.

---

## 4. Image Preparation & Optimization Guidelines

To keep page loads fast for mobile visitors on Hostinger, follow these guidelines:

### Recommended Image Specs:
- **Dimensions**:
  - Cover Photos: 1600px to 2000px on the longest edge.
  - Gallery Full Photos: 1200px to 1600px on the longest edge.
  - Thumbnails / Detail shots: 800px on the longest edge.
- **File Format**: Modern WebP (`.webp`) or progressive JPEG (`.jpeg` / `.jpg`).
- **Target File Size**: **150 KB – 350 KB** (rarely exceeding 500 KB).

### Recommended Free Mac Tools for Jim:
1. **ImageOptim (Free Mac App)**:
   - Drag and drop your exported photos onto ImageOptim. It will losslessly shrink their file sizes in seconds.
2. **Squoosh.app (Free Web Tool by Google Chrome Labs)**:
   - Open [squoosh.app](https://squoosh.app) in your browser.
   - Drop an image, select **WebP** or **MozJPEG**, set quality to 80%, and download.
3. **Adobe Lightroom or Apple Photos Preset**:
   - If exporting from Lightroom, save an export preset:
     - File type: JPEG (or WebP)
     - Quality: 80
     - Resize to fit: Long Edge 1600px
     - Color Space: sRGB

---

## 5. Local Preview & Testing

Before deploying, you can preview your new notes or galleries locally on your Mac:

1. **Start the local dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
2. **Test direct shareable URLs**:
   - Note: `http://localhost:3000/?note=my-new-article-title`
   - Gallery: `http://localhost:3000/?gallery=route-66`
3. **Run the content validator**:
   ```bash
   npm run validate
   ```
   The validator will check for missing dates, broken image paths, or missing alt text and tell you exactly what to fix.

---

## 6. Committing and Pushing to Publish

Once your content is ready and validated:

```bash
# Check changes
git status

# Stage your new files
git add content/ public/images/

# Commit with a descriptive message
git commit -m "Add Field Note: My New Article Title"

# Push to your GitHub repository
git push
```

Hostinger will detect the push (or you can run `npm run build` and upload the generated `dist/` folder).
