import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionDir = path.join(__dirname, '../extension');

console.log('🔍 Validating Chrome Extension...\n');

// Check required files
const requiredFiles = [
  'manifest.json',
  'index.html',
  'assets/popup.js',
  'assets/popup.css'
];

let allValid = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(extensionDir, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allValid = false;
});

// Check manifest.json
console.log('\n📋 Validating manifest.json:');
try {
  const manifestPath = path.join(extensionDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  console.log(`  ✅ Name: ${manifest.name}`);
  console.log(`  ✅ Version: ${manifest.version}`);
  console.log(`  ✅ Manifest Version: ${manifest.manifest_version}`);
  console.log(`  ✅ New Tab Override: ${manifest.chrome_url_overrides?.newtab}`);

  if (manifest.manifest_version !== 3) {
    console.log('  ❌ Should use manifest_version 3');
    allValid = false;
  }

  if (!manifest.chrome_url_overrides?.newtab) {
    console.log('  ❌ Missing newtab override');
    allValid = false;
  }

} catch (error) {
  console.log(`  ❌ Invalid manifest.json: ${error.message}`);
  allValid = false;
}

// Check HTML file
console.log('\n📄 Validating HTML:');
try {
  const htmlPath = path.join(extensionDir, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const hasRoot = html.includes('id="root"');
  const hasRelativePaths = !html.includes('src="/assets/') && !html.includes('href="/assets/');

  console.log(`  ${hasRoot ? '✅' : '❌'} Contains root element`);
  console.log(`  ${hasRelativePaths ? '✅' : '❌'} Uses relative asset paths`);

  if (!hasRoot || !hasRelativePaths) {
    allValid = false;
  }

} catch (error) {
  console.log(`  ❌ Invalid HTML file: ${error.message}`);
  allValid = false;
}

console.log('\n' + (allValid ? '✅ Extension validation passed!' : '❌ Extension validation failed!'));

if (allValid) {
  console.log('\n🚀 Ready to install!');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log('3. Click "Load unpacked"');
  console.log(`4. Select: ${extensionDir}`);
}