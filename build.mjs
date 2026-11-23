import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const source = name => new URL(name, import.meta.url);
const read = name => readFile(source(name), 'utf8');
const [shell, ...modules] = await Promise.all(
  ['shell.html', 'world.js', 'landmarks.js', 'car.js', 'drive.js'].map(read)
);
await mkdir(source('dist/'), { recursive: true });
await Promise.all([
  writeFile(source('dist/index.html'), shell.replace('<!-- INLINE_GAME -->', '<script type="module" src="./game.js"></script>')),
  writeFile(source('dist/game.js'), `import * as THREE from './three.module.min.js';
try {
${modules.join('\n')}
} catch (error) {
  console.error(error);
  document.querySelector('#startCard .desc').textContent = 'เปิดฉาก 3D ไม่สำเร็จ ลองเปิดด้วยเบราว์เซอร์ที่รองรับ WebGL 2 แล้วโหลดหน้าใหม่';
  document.querySelector('#start').disabled = true;
}
`),
  copyFile(source('vendor/three.module.min.js'), source('dist/three.module.min.js')),
  copyFile(source('vendor/LICENSE'), source('dist/THREE-LICENSE.txt'))
]);
