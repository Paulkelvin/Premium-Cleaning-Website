const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Ensure dist is clean
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
}
fs.mkdirSync(distPath, { recursive: true });

// 2. Copy root html files
const files = fs.readdirSync(__dirname);
for (let file of files) {
  if (file.endsWith('.html')) {
    fs.copyFileSync(path.join(__dirname, file), path.join(distPath, file));
  }
}

// 3. Copy SEO / static root files
const rootStaticFiles = ['sitemap.xml', 'robots.txt', '_redirects'];
for (const file of rootStaticFiles) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distPath, file));
  }
}

// 4. Copy assets and services directories
const dirsToCopy = ['assets', 'services'];
for (let dir of dirsToCopy) {
  const srcDir = path.join(__dirname, dir);
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, path.join(distPath, dir));
  }
}

// 5. Build the Sanity Studio into dist/studio so it's served at /studio
execSync('npx sanity build dist/studio -y', { stdio: 'inherit' });

// 6. Studio's index.html links its favicon/manifest from root-level /static
// regardless of basePath, so mirror those few icon files there too.
const studioIconFiles = ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'manifest.webmanifest'];
const studioStaticDir = path.join(distPath, 'studio', 'static');
const rootStaticDir = path.join(distPath, 'static');
if (fs.existsSync(studioStaticDir)) {
  fs.mkdirSync(rootStaticDir, { recursive: true });
  for (const file of studioIconFiles) {
    const src = path.join(studioStaticDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(rootStaticDir, file));
    }
  }
}

console.log('Build completed successfully! Public files copied to dist/');
