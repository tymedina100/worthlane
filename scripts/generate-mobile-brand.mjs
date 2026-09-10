import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const require = createRequire(resolve('apps/web/package.json'));
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const path = 'M6 13l9 23 9-17 9 17 9-23M18 9h12';
const mark = (color, transform = '') => `<path d="${path}" transform="${transform}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 48 48">${body}</svg>`;
const sources = {
  'icon': svg(`<rect width="48" height="48" fill="#193b32"/>${mark('#faf8f2', 'translate(5.76 5.76) scale(.76)')}`),
  'adaptive-icon': svg(mark('#faf8f2', 'translate(9.6 9.6) scale(.6)')),
  'splash': svg(mark('#193b32', 'translate(15.6 15.6) scale(.35)')),
  'notification-icon': svg(mark('#ffffff', 'translate(4.8 4.8) scale(.8)')),
};
for (const [name, source] of Object.entries(sources)) {
  const size = name === 'notification-icon' ? 96 : 1024;
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(`apps/mobile/assets/${name}.png`);
}
writeFileSync('apps/mobile/assets/brand-mark.svg', svg(mark('#193b32')));
console.log('Generated original vector-based mobile brand assets.');
