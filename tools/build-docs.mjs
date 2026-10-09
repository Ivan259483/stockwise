/**
 * Builds the StockWise technical documentation from docs/content.mjs:
 *   - docs/StockWise_Technical_Documentation.docx  (docx library)
 *   - docs/StockWise_Technical_Documentation.pdf   (same content as HTML, printed by headless Chrome)
 *
 * Formatting required by the instructor: headings 14 pt, body 11 pt, 1.5 line
 * spacing, 1-inch margins, one font throughout (Arial), page numbers in the
 * footer and figure captions. US Letter paper.
 *
 * Usage: node build-docs.mjs
 */
import fontkit from "@pdf-lib/fontkit";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
  HeadingLevel,
} from "docx";
import { estimatePageNumbers } from "docx/layout";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { BODY, META } from "./docs/content.mjs";
import { launch } from "./lib/browser.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const OUT_BASE = here("../docs/StockWise_Technical_Documentation");

const FONT = "Arial";
const BODY_PT = 11;
const HEADING_PT = 14;
const LINE = 360; // 1.5 line spacing in Word's 240ths of a line
/**
 * Word's "1.5 lines" is 1.5 × the font's natural line height, which for Arial
 * is about 1.15 em, so the HTML/PDF uses 1.725 to match the Word document.
 */
const CSS_LINE_HEIGHT = 1.725;
const INCH = 1440; // twips
const ACCENT = "312E81"; // primary-900 (indigo), used for level-1 headings
const PAGE_WIDTH_IN = 6.5; // 8.5" Letter minus two 1" margins

// --------------------------------------------------------------------------- shared helpers

/** Splits "**bold** and *italic*" into styled segments. */
const parseInline = (text) => {
  const segments = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    const token = match[0];
    segments.push(
      token.startsWith("**") ? { text: token.slice(2, -2), bold: true } : { text: token.slice(1, -1), italics: true }
    );
    last = match.index + token.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
};

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Inline markup → HTML, with bare URLs turned into links. */
const inlineHtml = (text) =>
  parseInline(text)
    .map(({ text: t, bold, italics }) => {
      let html = escapeHtml(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
      if (bold) html = `<strong>${html}</strong>`;
      if (italics) html = `<em>${html}</em>`;
      return html;
    })
    .join("");

/** Reads a PNG's pixel size from its header. */
const pngSize = (buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });

/** Adds running "Figure N" / "Table N" numbers to the blocks (shared by both outputs). */
const numberBlocks = (blocks) => {
  let figure = 0;
  let table = 0;
  return blocks.map((block) => {
    if (block.type === "figure") return { ...block, label: `Figure ${++figure}.` };
    if (block.type === "figureRow") {
      return { ...block, items: block.items.map((item) => ({ ...item, label: `Figure ${++figure}.` })) };
    }
    if (block.type === "table") return { ...block, label: `Table ${++table}.` };
    return block;
  });
};

const BLOCKS = numberBlocks(BODY);

// --------------------------------------------------------------------------- DOCX

const run = (segment, extra = {}) =>
  new TextRun({
    text: segment.text,
    bold: segment.bold,
    italics: segment.italics,
    font: FONT,
    size: BODY_PT * 2,
    ...extra,
  });

const runs = (text, extra) => parseInline(text).map((segment) => run(segment, extra));

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

/** One table cell paragraph (body size, 1.5 spacing like the rest of the document). */
const cell = (text, { header = false, width }) =>
  new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: header ? { type: ShadingType.CLEAR, fill: "E0E7FF", color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 100, right: 100 },
    children: [
      new Paragraph({
        spacing: { line: LINE, before: 0, after: 0 },
        children: runs(text, { bold: header || undefined }),
      }),
    ],
  });

const docxTable = (block) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: cellBorder,
      bottom: cellBorder,
      left: cellBorder,
      right: cellBorder,
      insideHorizontal: cellBorder,
      insideVertical: cellBorder,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: block.columns.map((c, i) => cell(c, { header: true, width: block.widths[i] })),
      }),
      ...block.rows.map(
        (row) => new TableRow({ cantSplit: true, children: row.map((c, i) => cell(c, { width: block.widths[i] })) })
      ),
    ],
  });

const image = async (src, widthIn) => {
  const data = await readFile(here(src));
  const { width, height } = pngSize(data);
  const w = Math.round(widthIn * 96);
  return new ImageRun({ type: "png", data, transformation: { width: w, height: Math.round((w * height) / width) } });
};

const caption = (label, text) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: LINE, before: 60, after: 160 },
    children: [run({ text: `${label} `, bold: true }), run({ text, italics: true })],
  });

/** Converts content blocks to docx paragraphs/tables. */
const buildDocxBody = async (numberingRefs) => {
  const children = [];
  let breakBefore = false;
  let listIndex = 0;

  const takeBreak = () => {
    const value = breakBefore;
    breakBefore = false;
    return value;
  };

  for (const block of BLOCKS) {
    switch (block.type) {
      case "pageBreak":
        breakBefore = true;
        break;
      case "h1":
      case "h2":
        children.push(
          new Paragraph({
            heading: block.type === "h1" ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            pageBreakBefore: takeBreak(),
            children: [new TextRun({ text: block.text })],
          })
        );
        break;
      case "p":
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            pageBreakBefore: takeBreak(),
            spacing: { line: LINE, after: 160 },
            children: runs(block.text),
          })
        );
        break;
      case "bullets":
      case "numbered": {
        const reference = block.type === "bullets" ? "bullets" : numberingRefs[listIndex++];
        block.items.forEach((item, i) =>
          children.push(
            new Paragraph({
              numbering: { reference, level: 0 },
              spacing: { line: LINE, after: i === block.items.length - 1 ? 160 : 40 },
              children: runs(item),
            })
          )
        );
        break;
      }
      case "table":
        children.push(
          new Paragraph({
            keepNext: true,
            spacing: { line: LINE, before: 120, after: 60 },
            children: [run({ text: `${block.label} `, bold: true }), run({ text: block.caption, italics: true })],
          })
        );
        children.push(docxTable(block));
        children.push(new Paragraph({ spacing: { line: LINE, after: 60 }, children: [] }));
        break;
      case "figure":
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: { before: 120 },
            children: [await image(block.src, block.width)],
          })
        );
        children.push(caption(block.label, block.caption));
        if (block.text) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: LINE, after: 240 },
              children: runs(block.text),
            })
          );
        }
        break;
      case "figureRow": {
        const width = Math.floor(100 / block.items.length);
        const cells = await Promise.all(
          block.items.map(
            async (item) =>
              new TableCell({
                width: { size: width, type: WidthType.PERCENTAGE },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [await image(item.src, block.width)] }),
                  caption(item.label, item.caption),
                ],
              })
          )
        );
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: noBorder,
              bottom: noBorder,
              left: noBorder,
              right: noBorder,
              insideHorizontal: noBorder,
              insideVertical: noBorder,
            },
            rows: [new TableRow({ cantSplit: true, children: cells })],
          })
        );
        if (block.text) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: LINE, after: 240 },
              children: runs(block.text),
            })
          );
        }
        break;
      }
      default:
        throw new Error(`Unknown block type: ${block.type}`);
    }
  }
  return children;
};

/** Cover page paragraphs (centered). */
const coverParagraphs = () => {
  const line = (text, { bold, italics, before = 0, after = 0, color, size = BODY_PT } = {}) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE, before, after },
      children: [new TextRun({ text, bold, italics, color, font: FONT, size: size * 2 })],
    });
  return [
    line("INTEGRATIVE PROGRAMMING AND TECHNOLOGIES", { bold: true, before: 1200, color: "475569" }),
    line("Final Project", { after: 1600, color: "475569" }),
    line(META.title.toUpperCase(), { bold: true, size: HEADING_PT, color: ACCENT }),
    line(META.subtitle, { italics: true, after: 400 }),
    line(META.documentType, { bold: true, after: 1600 }),
    line("Group Members", { bold: true }),
    ...META.members.map((member) => line(member, { after: 240 })),
    line(`Course: ${META.course}`),
    line(`Section: ${META.section}`),
    line(`Date: ${META.date}`, { after: 1200 }),
    line(`Live application: ${META.liveApp}`, { color: "475569" }),
    line(`Source code: ${META.repo}`, { color: "475569", after: 0 }),
  ];
};

const buildDocx = async () => {
  const numberedBlocks = BLOCKS.filter((b) => b.type === "numbered");
  const numberingRefs = numberedBlocks.map((_, i) => `numbered-${i}`);

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
            font: FONT,
            size: BODY_PT * 2,
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: "Ivan Tadena",
    title: META.title,
    description: "Technical documentation for the StockWise inventory management system",
    pageNumbers: estimatePageNumbers,
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY_PT * 2 }, paragraph: { spacing: { line: LINE } } },
        heading1: {
          run: { font: FONT, size: HEADING_PT * 2, bold: true, color: ACCENT },
          paragraph: { spacing: { line: LINE, before: 360, after: 120 }, keepNext: true, keepLines: true },
        },
        heading2: {
          run: { font: FONT, size: HEADING_PT * 2, bold: true, color: "1E293B" },
          paragraph: { spacing: { line: LINE, before: 240, after: 80 }, keepNext: true, keepLines: true },
        },
      },
      // The TOC lists only the main (level-1) headings so it fits on page 2 at 1.5 spacing.
      paragraphStyles: [
        {
          id: "TOC1",
          name: "toc 1",
          basedOn: "Normal",
          next: "Normal",
          run: { font: FONT, size: BODY_PT * 2 },
          paragraph: { spacing: { line: LINE, before: 0, after: 0 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 540, hanging: 300 } } },
            },
          ],
        },
        ...numberedBlocks.map((block, i) => ({
          reference: numberingRefs[i],
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              start: block.start ?? 1,
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 540, hanging: 360 } } },
            },
          ],
        })),
      ],
    },
    sections: [
      {
        properties: {
          titlePage: true, // no page number on the cover
          page: {
            size: { width: 8.5 * INCH, height: 11 * INCH },
            margin: { top: INCH, bottom: INCH, left: INCH, right: INCH },
          },
        },
        footers: { default: footer, first: new Footer({ children: [new Paragraph({ children: [] })] }) },
        children: [
          ...coverParagraphs(),
          new Paragraph({
            pageBreakBefore: true,
            spacing: { line: LINE, after: 200 },
            children: [
              new TextRun({ text: "Table of Contents", bold: true, font: FONT, size: HEADING_PT * 2, color: ACCENT }),
            ],
          }),
          new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-1" }),
          new Paragraph({ pageBreakBefore: true, children: [] }),
          ...(await buildDocxBody(numberingRefs)),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  await writeFile(`${OUT_BASE}.docx`, buffer);
  console.log(`docx written (${Math.round(buffer.length / 1024)} KB)`);
};

// --------------------------------------------------------------------------- HTML / PDF

const headingId = (text) => `h-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const htmlBody = async () => {
  const parts = [];
  let breakBefore = false;
  const breakClass = () => {
    const value = breakBefore ? ' class="page-break"' : "";
    breakBefore = false;
    return value;
  };
  const imgSrc = async (src) => `data:image/png;base64,${(await readFile(here(src))).toString("base64")}`;

  for (const block of BLOCKS) {
    switch (block.type) {
      case "pageBreak":
        breakBefore = true;
        break;
      case "h1":
      case "h2": {
        const tag = block.type;
        parts.push(`<${tag} id="${headingId(block.text)}"${breakClass()}>${escapeHtml(block.text)}</${tag}>`);
        break;
      }
      case "p":
        parts.push(`<p${breakClass()}>${inlineHtml(block.text)}</p>`);
        break;
      case "bullets":
        parts.push(`<ul>${block.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ul>`);
        break;
      case "numbered":
        parts.push(
          `<ol start="${block.start ?? 1}">${block.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ol>`
        );
        break;
      case "table":
        parts.push(`<div class="table-block">
          <p class="table-caption"><strong>${block.label}</strong> <em>${escapeHtml(block.caption)}</em></p>
          <table><colgroup>${block.widths.map((w) => `<col style="width:${w}%">`).join("")}</colgroup>
          <thead><tr>${block.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
          <tbody>${block.rows.map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table></div>`);
        break;
      case "figure":
        parts.push(`<figure><img src="${await imgSrc(block.src)}" style="width:${block.width}in" alt="${escapeHtml(block.caption)}">
          <figcaption><strong>${block.label}</strong> <em>${escapeHtml(block.caption)}</em></figcaption></figure>`);
        if (block.text) parts.push(`<p class="figure-text">${inlineHtml(block.text)}</p>`);
        break;
      case "figureRow": {
        const items = await Promise.all(
          block.items.map(
            async (
              item
            ) => `<figure><img src="${await imgSrc(item.src)}" style="width:${block.width}in" alt="${escapeHtml(item.caption)}">
            <figcaption><strong>${item.label}</strong> <em>${escapeHtml(item.caption)}</em></figcaption></figure>`
          )
        );
        parts.push(`<div class="figure-row">${items.join("")}</div>`);
        if (block.text) parts.push(`<p class="figure-text">${inlineHtml(block.text)}</p>`);
        break;
      }
      default:
        throw new Error(`Unknown block type: ${block.type}`);
    }
  }
  return parts.join("\n");
};

/**
 * Table of contents (main headings only, like the Word TOC) with dotted
 * leaders; `pages` maps heading text → page number.
 */
const tocHtml = (pages) =>
  BLOCKS.filter((b) => b.type === "h1")
    .map(
      (b) => `<div class="toc-${b.type}"><a href="#${headingId(b.text)}">${escapeHtml(b.text)}</a>
        <span class="leader"></span><span class="toc-page">${pages?.[b.text] ?? "00"}</span></div>`
    )
    .join("\n");

const buildHtml = async (pages) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(META.title)}</title>
<style>
  @page { size: Letter; margin: 1in; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: ${FONT}, Helvetica, sans-serif; font-size: ${BODY_PT}pt; line-height: ${CSS_LINE_HEIGHT}; color: #0f172a; }
  h1, h2 { font-size: ${HEADING_PT}pt; line-height: ${CSS_LINE_HEIGHT}; margin: 18pt 0 6pt; break-after: avoid; }
  h1 { color: #${ACCENT}; }
  h2 { color: #1e293b; margin-top: 12pt; }
  p { margin: 0 0 8pt; text-align: justify; }
  ul, ol { margin: 0 0 8pt; padding-left: 0.38in; }
  li { margin-bottom: 2pt; }
  a { color: inherit; text-decoration: none; }
  .page-break { break-before: page; }
  .cover { height: 9in; display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 0.8in; }
  .cover .muted { color: #475569; }
  .cover .title { font-size: ${HEADING_PT}pt; font-weight: bold; color: #${ACCENT}; margin-top: 1.1in; }
  .cover p { text-align: center; margin: 0; }
  .toc-title { font-size: ${HEADING_PT}pt; font-weight: bold; color: #${ACCENT}; margin: 0 0 10pt; }
  .toc-h1 { display: flex; align-items: baseline; }
  .leader { flex: 1; border-bottom: 1.5px dotted #64748b; margin: 0 6px; transform: translateY(-3px); }
  figure { margin: 8pt 0 0; text-align: center; break-inside: avoid; }
  figure img { border: 1px solid #cbd5e1; }
  figcaption { margin-top: 4pt; margin-bottom: 8pt; }
  .figure-text { margin-bottom: 14pt; }
  .figure-row { display: flex; justify-content: space-between; break-inside: avoid; }
  .figure-row figure { width: 32%; }
  .table-block { margin: 8pt 0 10pt; }
  .table-caption { margin: 0 0 3pt; text-align: left; break-after: avoid; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #94a3b8; padding: 2pt 5pt; text-align: left; vertical-align: top; }
  th { background: #e0e7ff; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
</style></head>
<body>
  <section class="cover">
    <p class="muted"><strong>INTEGRATIVE PROGRAMMING AND TECHNOLOGIES</strong></p>
    <p class="muted">Final Project</p>
    <p class="title">${escapeHtml(META.title.toUpperCase())}</p>
    <p><em>${escapeHtml(META.subtitle)}</em></p>
    <p style="margin-top:0.25in"><strong>${META.documentType}</strong></p>
    <p style="margin-top:1.1in"><strong>Group Members</strong></p>
    ${META.members.map((m) => `<p>${escapeHtml(m)}</p>`).join("")}
    <p style="margin-top:0.15in">Course: ${escapeHtml(META.course)}</p>
    <p>Section: ${META.section}</p>
    <p>Date: ${META.date}</p>
    <p class="muted" style="margin-top:0.8in">Live application: ${META.liveApp}</p>
    <p class="muted">Source code: ${META.repo}</p>
  </section>
  <section class="page-break">
    <p class="toc-title">Table of Contents</p>
    ${tocHtml(pages)}
  </section>
  <section class="page-break">
  ${await htmlBody()}
  </section>
</body></html>`;

/** Prints HTML to PDF with Chrome (no header/footer; page numbers are stamped afterwards). */
const printPdf = async (browser, html) => {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluateHandle("document.fonts.ready");
  const pdf = await page.pdf({ format: "Letter", printBackground: true, preferCSSPageSize: true, outline: true });
  await page.close();
  return pdf;
};

/**
 * Finds the page each heading starts on, using the PDF outline (bookmarks)
 * that Chrome generates from the h1/h2 elements. This is exact even for short
 * headings such as "Products" that also appear in body text.
 */
const findHeadingPages = async (pdfBuffer) => {
  const pdf = await getDocument({ data: new Uint8Array(pdfBuffer), useSystemFonts: true }).promise;
  const flatten = (items) => items.flatMap((item) => [item, ...flatten(item.items ?? [])]);
  const outline = flatten((await pdf.getOutline()) ?? []);

  const pages = {};
  for (const block of BLOCKS.filter((b) => b.type === "h1" || b.type === "h2")) {
    const entry = outline.find((item) => item.title.trim() === block.text && !(item.title in pages));
    if (!entry) throw new Error(`Heading not found in PDF outline: ${block.text}`);
    const dest = typeof entry.dest === "string" ? await pdf.getDestination(entry.dest) : entry.dest;
    pages[block.text] = (await pdf.getPageIndex(dest[0])) + 1;
  }
  return { pages, total: pdf.numPages };
};

/** Stamps "Page X of Y" (Arial 11 pt) in the bottom margin of every page except the cover. */
const stampPageNumbers = async (pdfBuffer) => {
  const pdf = await PDFDocument.load(pdfBuffer);
  pdf.registerFontkit(fontkit);
  const arial = await pdf.embedFont(await readFile("/System/Library/Fonts/Supplemental/Arial.ttf"), { subset: true });
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    if (index === 0) return;
    const label = `Page ${index + 1} of ${pages.length}`;
    const width = arial.widthOfTextAtSize(label, BODY_PT);
    page.drawText(label, {
      x: (page.getWidth() - width) / 2,
      y: 0.5 * 72 - 4,
      size: BODY_PT,
      font: arial,
      color: rgb(0.2, 0.2, 0.2),
    });
  });
  pdf.setTitle(META.title);
  pdf.setAuthor("Ivan Tadena");
  return pdf.save();
};

const buildPdf = async () => {
  const browser = await launch();
  try {
    // Pass 1 finds where each heading lands; pass 2 writes those numbers into the TOC.
    const draft = await printPdf(browser, await buildHtml(null));
    const { pages } = await findHeadingPages(draft);
    const final = await printPdf(browser, await buildHtml(pages));
    const check = await findHeadingPages(final);
    const moved = Object.keys(pages).filter((k) => pages[k] !== check.pages[k]);
    if (moved.length) throw new Error(`TOC page numbers shifted between passes: ${moved.join(", ")}`);

    await writeFile(`${OUT_BASE}.pdf`, await stampPageNumbers(final));
    console.log(`pdf written (${check.total} pages)`);
    return check.pages;
  } finally {
    await browser.close();
  }
};

await buildDocx();
const pdfPages = await buildPdf();
console.log("PDF heading pages:", JSON.stringify(pdfPages));
