import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, '../build');
const extensionDir = path.join(__dirname, '../extension');

console.log('Building Chrome Extension...');

// Clean previous builds
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}

if (fs.existsSync(extensionDir)) {
  fs.rmSync(extensionDir, { recursive: true, force: true });
}

// Build the project
console.log('Running vite build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Create extension directory
fs.mkdirSync(extensionDir, { recursive: true });

// Copy built files to extension directory
console.log('Copying files to extension directory...');
const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

copyDir(buildDir, extensionDir);

// Fix HTML asset paths for extension
const indexPath = path.join(extensionDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let htmlContent = fs.readFileSync(indexPath, 'utf8');
  // Replace absolute paths with relative paths
  htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="assets/');
  htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="assets/');
  fs.writeFileSync(indexPath, htmlContent);
}

// Fix CSS font paths for extension
const cssFiles = fs.readdirSync(path.join(extensionDir, 'assets'), { withFileTypes: true })
  .filter(file => file.isFile() && file.name.endsWith('.css'))
  .map(file => path.join(extensionDir, 'assets', file.name));

cssFiles.forEach(cssFile => {
  if (fs.existsSync(cssFile)) {
    let cssContent = fs.readFileSync(cssFile, 'utf8');
    // Replace absolute font paths with relative paths
    cssContent = cssContent.replace(/url\('\/fonts\//g, "url('../fonts/");
    cssContent = cssContent.replace(/url\("\/fonts\//g, 'url("../fonts/');
    cssContent = cssContent.replace(/url\(\/fonts\//g, 'url(../fonts/');
    fs.writeFileSync(cssFile, cssContent);
  }
});

// Copy manifest.json
const manifestSource = path.join(__dirname, '../public/manifest.json');
const manifestDest = path.join(extensionDir, 'manifest.json');
fs.copyFileSync(manifestSource, manifestDest);

// Copy icons
const iconsSource = path.join(__dirname, '../public/icons');
const iconsDest = path.join(extensionDir, 'icons');
if (fs.existsSync(iconsSource)) {
  copyDir(iconsSource, iconsDest);
}

// Copy fonts
const fontsSource = path.join(__dirname, '../public/fonts');
const fontsDest = path.join(extensionDir, 'fonts');
if (fs.existsSync(fontsSource)) {
  copyDir(fontsSource, fontsDest);
}

console.log('✅ Chrome Extension build completed!');
console.log(`📁 Extension ready in: ${extensionDir}`);
console.log('\nTo install the extension:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked"');
console.log(`4. Select the folder: ${extensionDir}`);