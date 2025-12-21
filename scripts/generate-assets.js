const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PRIMARY = '#d1fe18';
const FOREGROUND = '#26293B';

const svgString = `
<svg width="512" height="512" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="44" height="44" rx="12" ry="12" fill="${PRIMARY}" />
  <g transform="translate(8, 8) scale(1.1666)">
    <g stroke="${FOREGROUND}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M9 7v4M7 9h4" transform="rotate(45 9 9)" />
      <path d="M15 7v4M13 9h4" transform="rotate(45 15 9)" />
      <path d="M8 15c1.5 2 4.5 2 8 0" />
    </g>
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const buffer = Buffer.from(svgString);

  console.log('Generating logo.png...');
  await sharp(buffer)
    .png()
    .resize(512, 512)
    .toFile(path.join(publicDir, 'logo.png'));

  console.log('Generating favicon.ico...');
  // Generating a 32x32 PNG disguised as ICO for compatibility in this simple script
  await sharp(buffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
    
  console.log('Done.');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
