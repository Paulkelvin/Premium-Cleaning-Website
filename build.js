const fs = require('fs');
const path = require('path');

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

// 3. Copy assets and services directories
const dirsToCopy = ['assets', 'services'];
for (let dir of dirsToCopy) {
  const srcDir = path.join(__dirname, dir);
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, path.join(distPath, dir));
  }
}

console.log('Build completed successfully! Public files copied to dist/');
