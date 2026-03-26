// Standalone PDF text extractor — run via node scripts/extract-pdf.mjs <filepath>
// All pdfjs warnings go to stderr, only clean JSON goes to stdout
import { getDocument } from 'pdfjs-dist/build/pdf.mjs';
import fs from 'fs';

// Capture stdout — suppress ALL console output during parsing
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
console.log = (...args) => process.stderr.write('[pdf] ' + args.join(' ') + '\n');
console.warn = (...args) => process.stderr.write('[pdf] ' + args.join(' ') + '\n');
console.error = (...args) => process.stderr.write('[pdf] ' + args.join(' ') + '\n');

const filePath = process.argv[2];
if (!filePath) { process.stderr.write('Usage: node extract-pdf.mjs <file>\n'); process.exit(1); }

const data = new Uint8Array(fs.readFileSync(filePath));
const doc = await getDocument({ data, useSystemFonts: true }).promise;

let text = '';
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  for (const item of content.items) {
    if ('str' in item) text += item.str + ' ';
  }
  text += '\n';
}

// Restore and output clean JSON
console.log = origLog;
console.warn = origWarn;
console.error = origError;
process.stdout.write(JSON.stringify({ text, pages: doc.numPages }));
