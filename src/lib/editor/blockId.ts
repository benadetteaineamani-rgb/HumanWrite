import { Extension } from "@tiptap/core";
import { newBlockId } from "@/lib/editor/model";

/**
 * BlockId extension (Stage 1 §1). Adds a stable `data-block-id` attribute to
 * every block-level node so diagnostics, comments, revisions and AI edits can
 * reference blocks by a persistent id that survives edits and reloads.
 *
 * This is deliberately implemented as a global attribute on the existing node
 * types rather than custom nodes, so it applies to paragraphs, headings, lists
 * and blockquotes today and to tables, equations and diagrams when those node
 * types are added in later stages — no migration required.
 */
export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "bulletList",
          "orderedList",
          "listItem",
          "codeBlock",
        ],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) => {
              if (!attributes.blockId) return {};
              return { "data-block-id": attributes.blockId as string };
            },
          },
        },
      },
    ];
  },

  // Ensure every block has an id after any change (assign to any that lack one).
  onUpdate() {
    const { state, view } = this.editor;
    const tr = state.tr;
    let modified = false;
    state.doc.descendants((node, pos) => {
      if (node.isBlock && node.type.name !== "doc" && node.type.name !== "text") {
        if (node.attrs && "blockId" in node.attrs && !node.attrs.blockId) {
          tr.setNodeAttribute(pos, "blockId", newBlockId());
          modified = true;
        }
      }
    });
    if (modified) view.dispatch(tr.setMeta("addToHistory", false));
  },
});
