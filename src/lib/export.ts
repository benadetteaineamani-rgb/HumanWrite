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
