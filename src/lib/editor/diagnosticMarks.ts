import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * DiagnosticMarks (inline underlines). Draws underline decorations for the
 * specific phrases the local diagnostic engine flags, so issues appear where
 * they occur in the document — like an editor's marks — not only in the side
 * panel. Decorations are presentation only; they never alter the document, so
 * they cannot corrupt content, and they clear when toggled off.
 *
 * Colour language matches the app: gold = openings/rhythm, terracotta =
 * empty/low-information, violet/accent = repetition/formulaic.
 */

export interface DiagPhrase {
  text: string; // the exact substring to underline
  kind: "opening" | "empty" | "formulaic" | "repetition";
  note: string; // tooltip
}

export const diagKey = new PluginKey("humanwrite-diagnostics");

const COLOUR: Record<DiagPhrase["kind"], string> = {
  opening: "#A77B39",    // gold
  empty: "#A7554C",      // terracotta
  formulaic: "#5B3A70",  // aubergine
  repetition: "#76528F", // violet
};

export const DiagnosticMarks = Extension.create<{ phrases: DiagPhrase[]; enabled: boolean }>({
  name: "diagnosticMarks",

  addOptions() {
    return { phrases: [], enabled: false };
  },

  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: diagKey,
        props: {
          decorations(state) {
            const { phrases, enabled } = ext.options;
            if (!enabled || !phrases.length) return DecorationSet.empty;
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const text = node.text;
              const lower = text.toLowerCase();
              phrases.forEach((p) => {
                const needle = p.text.toLowerCase();
                if (!needle) return;
                let from = 0;
                // underline up to a few occurrences per text node
                let count = 0;
                while (count < 5) {
                  const idx = lower.indexOf(needle, from);
                  if (idx < 0) break;
                  const start = pos + idx;
                  const end = start + needle.length;
                  decos.push(
                    Decoration.inline(start, end, {
                      style: `border-bottom:2px solid ${COLOUR[p.kind]};`,
                      title: p.note,
                      class: "hw-diag",
                    })
                  );
                  from = idx + needle.length;
                  count++;
                }
              });
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
