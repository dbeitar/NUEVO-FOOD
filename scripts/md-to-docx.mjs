import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const mdPath = path.join(rootDir, 'docs', 'manuales', '04_TECNICO_Y_DESPLIEGUE.md');
const outDir = path.join(rootDir, 'docs');
const outPath = path.join(outDir, 'D28D_TECNICO_Y_DESPLIEGUE.docx');
const fallbackOutPath = path.join(outDir, 'D28D_TECNICO_Y_DESPLIEGUE_ACTUALIZADO.docx');

function parseMarkdownToDocxBlocks(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let inCode = false;
  let codeBuffer = [];

  const isTableLine = (line) => /^\s*\|.*\|\s*$/.test(line);
  const isTableDivider = (line) => /^\s*\|?[\s:-]+\|[\s|:-]*\|?\s*$/.test(line);
  const parseTableRow = (line) => line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

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
    if (isTableLine(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const rows = [parseTableRow(line)];
      i += 2;
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      i -= 1;
      blocks.push({ type: 'table', rows });
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

function cleanInlineMarkdown(text = '') {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

function makeParagraph(text, options = {}) {
  return new Paragraph({
    ...options,
    children: [
      new TextRun({
        text: cleanInlineMarkdown(text),
        font: 'Arial',
      }),
    ],
  });
}

function makeTable(rows) {
  const usableWidth = 9360;
  const columnCount = Math.max(...rows.map((row) => row.length));
  const widthProfiles = {
    2: [3000, 6360],
    3: [1800, 2600, 4960],
    4: [1500, 2300, 2460, 3100],
  };
  const widths = widthProfiles[columnCount] || Array.from({ length: columnCount }, () => Math.floor(usableWidth / columnCount));
  widths[widths.length - 1] += usableWidth - widths.reduce((sum, width) => sum + width, 0);

  const border = { style: BorderStyle.SINGLE, size: 1, color: 'D9E2EC' };

  return new Table({
    width: { size: usableWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((row, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      children: widths.map((width, cellIndex) => new TableCell({
        width: { size: width, type: WidthType.DXA },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        shading: rowIndex === 0 ? { fill: 'F1F5F9' } : undefined,
        borders: { top: border, bottom: border, left: border, right: border },
        children: [
          new Paragraph({
            alignment: cellIndex === 0 && columnCount > 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: cleanInlineMarkdown(row[cellIndex] || ''),
                bold: rowIndex === 0,
                size: rowIndex === 0 ? 21 : 20,
                font: 'Arial',
                color: rowIndex === 0 ? '0F172A' : '1F2937',
              }),
            ],
          }),
        ],
      })),
    })),
  });
}

function blocksToDocParagraphs(blocks) {
  const paras = [];
  for (const b of blocks) {
    if (b.type === 'blank') {
      paras.push(new Paragraph(''));
      continue;
    }
    if (b.type === 'h1') {
      paras.push(makeParagraph(b.text, { heading: HeadingLevel.TITLE }));
      continue;
    }
    if (b.type === 'h2') {
      paras.push(makeParagraph(b.text, { heading: HeadingLevel.HEADING_1 }));
      continue;
    }
    if (b.type === 'h3') {
      paras.push(makeParagraph(b.text, { heading: HeadingLevel.HEADING_2 }));
      continue;
    }
    if (b.type === 'li') {
      paras.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: cleanInlineMarkdown(b.text), font: 'Arial' })],
      }));
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
    if (b.type === 'table') {
      paras.push(makeTable(b.rows));
      paras.push(new Paragraph(''));
      continue;
    }
    if (b.type === 'p') {
      paras.push(makeParagraph(b.text));
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
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  return Packer.toBuffer(doc).then((buffer) => {
    try {
      fs.writeFileSync(outPath, buffer);
      console.log('Documento Word generado en:', outPath);
    } catch (error) {
      if (error?.code !== 'EPERM' && error?.code !== 'EACCES') throw error;
      fs.writeFileSync(fallbackOutPath, buffer);
      console.log('El documento original está bloqueado por macOS o por Word.');
      console.log('Documento Word generado en:', fallbackOutPath);
    }
  });
}

main().catch((e) => {
  console.error('Error generando DOCX:', e);
  process.exit(1);
});
