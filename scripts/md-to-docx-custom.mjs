import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tomar el archivo de entrada como argumento de línea de comandos
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Uso: node md-to-docx.mjs <archivo-markdown.md>');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const mdPath = path.resolve(rootDir, inputFile);

// Generar nombre de salida basado en el archivo de entrada
const baseName = path.basename(inputFile, '.md');
const outDir = path.join(rootDir, 'docs');
const outPath = path.join(outDir, `${baseName}.docx`);

function parseMarkdownToDocxBlocks(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let inCode = false;
  let codeBuffer = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      if (inCode) {
        // flush code block
        const codeText = codeBuffer.join('\n');
        blocks.push({ type: 'code', text: codeText });
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }
    // headings
    const h1 = line.match(/^# (.*)/);
    const h2 = line.match(/^## (.*)/);
    const h3 = line.match(/^### (.*)/);
    if (h1) {
      blocks.push({ type: 'h1', text: h1[1].trim() });
      continue;
    }
    if (h2) {
      blocks.push({ type: 'h2', text: h2[1].trim() });
      continue;
    }
    if (h3) {
      blocks.push({ type: 'h3', text: h3[1].trim() });
      continue;
    }
    // lists
    const ul = line.match(/^\* (.*)/);
    const ol = line.match(/^\d+\. (.*)/);
    if (ul) {
      blocks.push({ type: 'ul', text: ul[1].trim() });
      continue;
    }
    if (ol) {
      blocks.push({ type: 'ol', text: ol[1].trim() });
      continue;
    }
    // empty lines
    if (line.trim() === '') {
      blocks.push({ type: 'empty' });
      continue;
    }
    // regular paragraph
    blocks.push({ type: 'p', text: line.trim() });
  }
  return blocks;
}

function createDocxFromBlocks(blocks) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: blocks.map(block => {
        switch (block.type) {
          case 'h1':
            return new Paragraph({
              text: block.text,
              heading: HeadingLevel.TITLE,
              spacing: { after: 300 },
            });
          case 'h2':
            return new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 250 },
            });
          case 'h3':
            return new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 },
            });
          case 'ul':
          case 'ol':
            return new Paragraph({
              text: block.text,
              bullet: { level: 0 },
              spacing: { after: 100 },
            });
          case 'code':
            return new Paragraph({
              children: [new TextRun({
                text: block.text,
                font: 'Courier New',
                size: 20,
              })],
              spacing: { after: 200 },
            });
          case 'empty':
            return new Paragraph({
              text: '',
              spacing: { after: 100 },
            });
          default:
            return new Paragraph({
              text: block.text,
              spacing: { after: 100 },
            });
        }
      }),
    }],
  });
  return doc;
}

async function main() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Read markdown file
    const md = fs.readFileSync(mdPath, 'utf8');

    // Parse to blocks
    const blocks = parseMarkdownToDocxBlocks(md);

    // Create docx
    const doc = createDocxFromBlocks(blocks);

    // Write to file
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);

    console.log(`✅ Documento Word generado: ${outPath}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();