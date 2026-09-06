import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

/**
 * Genuine .docx export (§23). Builds a real Open XML document from the editor's
 * structured block model using the `docx` library — never HTML renamed .doc.
 * Runs client-side; produces a Blob the browser downloads.
 */

export interface ExportBlock {
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "blockquote" | "listItem";
  runs: { text: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean }[];
}

const HEADING: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined> = {
  heading1: HeadingLevel.HEADING_1,
  heading2: HeadingLevel.HEADING_2,
  heading3: HeadingLevel.HEADING_3,
};

export async function exportDocx(title: string, blocks: ExportBlock[]): Promise<Blob> {
  const paragraphs = blocks.map((b) => {
    const children = b.runs.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          underline: r.underline ? {} : undefined,
          strike: r.strike,
        })
    );
    if (HEADING[b.type]) return new Paragraph({ heading: HEADING[b.type], children });
    if (b.type === "blockquote") return new Paragraph({ children, style: "IntenseQuote" });
    if (b.type === "listItem") return new Paragraph({ children, bullet: { level: 0 } });
    return new Paragraph({ children });
  });

  const doc = new Document({ sections: [{ children: paragraphs }], title });
  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Convert the editor's HTML into ExportBlock[] for genuine DOCX export.
 * Runs in the browser (uses DOMParser). Maps headings, paragraphs, blockquotes
 * and list items to structured blocks with bold/italic/underline marks.
 */
export function htmlToExportBlocks(html: string): ExportBlock[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: ExportBlock[] = [];
  const runsOf = (el: Element): ExportBlock["runs"] => {
    const runs: ExportBlock["runs"] = [];
    const walk = (node: Node, marks: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean }) => {
      node.childNodes.forEach((c) => {
        if (c.nodeType === 3) { const t = c.textContent || ""; if (t) runs.push({ text: t, ...marks }); return; }
        if (c.nodeType !== 1) return;
        const tag = (c as Element).tagName.toLowerCase();
        const m = { ...marks };
        if (tag === "strong" || tag === "b") m.bold = true;
        else if (tag === "em" || tag === "i") m.italic = true;
        else if (tag === "u") m.underline = true;
        else if (tag === "s" || tag === "strike" || tag === "del") m.strike = true;
        walk(c, m);
      });
    };
    walk(el, {});
    return runs.length ? runs : [{ text: el.textContent || "" }];
  };
  doc.body.childNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "h1") blocks.push({ type: "heading1", runs: runsOf(el) });
    else if (tag === "h2") blocks.push({ type: "heading2", runs: runsOf(el) });
    else if (tag === "h3") blocks.push({ type: "heading3", runs: runsOf(el) });
    else if (tag === "blockquote") blocks.push({ type: "blockquote", runs: runsOf(el) });
    else if (tag === "ul" || tag === "ol") el.querySelectorAll("li").forEach((li) => blocks.push({ type: "listItem", runs: runsOf(li) }));
    else if (tag === "p") blocks.push({ type: "paragraph", runs: runsOf(el) });
  });
  return blocks;
}
