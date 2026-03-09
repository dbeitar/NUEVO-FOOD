import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const mdPath = path.join(rootDir, 'DOCUMENTO_TECNICO_FOOD_PLAN.md');
const outDir = path.join(rootDir, 'docs');
const outPath = path.join(outDir, 'DOCUMENTO_TECNICO_FOOD_PLAN.docx');

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
    const li = line.match(/^-\s+(.*)/);
    if (li) {
      blocks.push({ type: 'li', text: li[1].trim() });
      continue;
    }
    // empty or paragraph
    if (line.trim() === '') {
      blocks.push({ type: 'blank' });
    } else {
      blocks.push({ type: 'p', text: line });
    }
  }
  return blocks;
}

function blocksToDocParagraphs(blocks) {
  const paras = [];
  let inList = false;
  for (const b of blocks) {
    if (b.type === 'blank') {
      paras.push(new Paragraph(''));
      continue;
    }
    if (b.type === 'h1') {
      paras.push(new Paragraph({ text: b.text, heading: HeadingLevel.TITLE }));
      continue;
    }
    if (b.type === 'h2') {
      paras.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_1 }));
      continue;
    }
    if (b.type === 'h3') {
      paras.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_2 }));
      continue;
    }
    if (b.type === 'li') {
      // simple bullet list
      paras.push(new Paragraph({ text: `• ${b.text}` }));
      continue;
    }
    if (b.type === 'code') {
      const codeLines = b.text.split('\n');
      codeLines.forEach((l) => {
        paras.push(
          new Paragraph({
            children: [
              new TextRun({
                text: l,
                font: { name: 'Consolas' },
              }),
            ],
          }),
        );
      });
      continue;
    }
    if (b.type === 'p') {
      paras.push(new Paragraph(b.text));
    }
  }
  return paras;
}

function main() {
  if (!fs.existsSync(mdPath)) {
    console.error('No se encontró el archivo Markdown:', mdPath);
    process.exit(1);
  }
  const md = fs.readFileSync(mdPath, 'utf-8');
  const blocks = parseMarkdownToDocxBlocks(md);
  const paragraphs = blocksToDocParagraphs(blocks);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  return Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(outPath, buffer);
    console.log('Documento Word generado en:', outPath);
  });
}

main().catch((e) => {
  console.error('Error generando DOCX:', e);
  process.exit(1);
});

