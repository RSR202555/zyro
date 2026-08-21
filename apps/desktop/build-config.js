const fs = require('fs');
const path = require('path');

let startUrl = 'https://zyro8837.vercel.app';

try {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^ELECTRON_START_URL=(.+)$/m) || envContent.match(/^NEXT_PUBLIC_APP_URL=(.+)$/m);
    if (match && match[1]) {
      startUrl = match[1].trim();
    }
  }
} catch (e) {
  console.error('Error reading .env file:', e);
}

const config = { startUrl };
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'config.json'), JSON.stringify(config, null, 2));
console.log(`[build-config] Config written to dist/config.json: ${startUrl}`);
