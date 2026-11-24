// Copia (minificata) la libreria QR in js/vendor/qrcode.js
import { build } from 'esbuild';
await build({ entryPoints: ['node_modules/qrcode-generator/dist/qrcode.mjs'], bundle: true, format: 'esm', minify: true, legalComments: 'eof', outfile: '../js/vendor/qrcode.js' });
