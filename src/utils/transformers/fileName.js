/**
 * Custom Shiki transformer that adds file name labels to code blocks.
 *
 * This transformer looks for the `file="filename"` meta attribute in code blocks
 * and creates a flat styled label showing the filename.
 */
export const transformerFileName = ({
  style = "v2",
  hideDot = false,
} = {}) => ({
  pre(node) {
    const fileNameOffset = style === "v1" ? "0.75rem" : "-0.75rem";
    node.properties.style =
      (node.properties.style || "") + `--file-name-offset: ${fileNameOffset};`;

    const raw = this.options.meta?.__raw?.split(" ");

    if (!raw) return;

    const metaMap = new Map();

    for (const item of raw) {
      const [key, value] = item.split("=");
      if (!key || !value) continue;
      metaMap.set(key, value.replace(/["'`]/g, ""));
    }

    const file = metaMap.get("file");

    if (!file) return;

    this.addClassToHast(
      node,
      `mt-8 ${style === "v1" ? "rounded-tl-none" : ""}`
    );

    node.children.push({
      type: "element",
      tagName: "span",
      properties: {
        class: [
          "absolute py-1 text-muted-foreground text-xs font-medium leading-4",
          hideDot
            ? "px-2"
            : "pl-4 pr-2 before:inline-block before:size-1.5 before:bg-secondary before:rounded-full before:absolute before:top-1/2 before:-translate-y-1/2 before:left-2",
          style === "v1"
            ? "left-0 -top-6 rounded-t-sm border border-border border-b-0 bg-surface"
            : "left-3 top-(--file-name-offset) border border-border rounded-sm bg-background",
        ],
      },
      children: [
        {
          type: "text",
          value: file,
        },
      ],
    });
  },
});
