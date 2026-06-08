/* eslint-disable */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('[zip-dist] dist/ folder not found. Run `npm run build` first.');
  process.exit(1);
}

const pkg = require(path.join(root, 'package.json'));
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const zipName = `${pkg.name}-${pkg.version}-${stamp}.zip`;
const outPath = path.join(root, 'dist', zipName);

(async () => {
  const { ZipArchive } = await import('archiver');

  const output = fs.createWriteStream(outPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  output.on('close', () => {
    const mb = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`[zip-dist] created ${zipName} (${mb} MB)`);
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') console.warn('[zip-dist] warning:', err);
    else throw err;
  });
  archive.on('error', (err) => { throw err; });

  archive.pipe(output);
  archive.directory(distDir, false);
  await archive.finalize();
})().catch((err) => {
  console.error('[zip-dist] failed:', err);
  process.exit(1);
});
