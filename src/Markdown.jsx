// Renders the small Markdown subset the chat prompt asks for: paragraphs,
// bullet/numbered lists, fenced code blocks, `code`, **bold**, *italic* and
// links. Builds React elements (never innerHTML), so model output can't inject
// markup into the page.

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text, keyPrefix) {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link && /^https?:\/\//.test(link[2])) {
      return (
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      );
    }
    return part;
  });
}

function parseBlocks(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^\s*```(\w*)/);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++; // closing fence (or end of text)
      blocks.push({ type: "code", lang: fence[1], text: code.join("\n") });
      continue;
    }

    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const pattern = ordered ? numbered : bullet;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) {
        let item = lines[i++].replace(pattern, "");
        // Indented lines continue the previous item.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !bullet.test(lines[i]) && !numbered.test(lines[i])) {
          item += " " + lines[i++].trim();
        }
        items.push(item);
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*```/.test(lines[i]) &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i])
    ) {
      // Headings aren't expected, but show them as bold text if they appear.
      para.push(lines[i++].replace(/^#{1,6}\s+(.*)$/, "**$1**"));
    }
    blocks.push({ type: "p", text: para.join("\n") });
  }
  return blocks;
}

export default function Markdown({ text }) {
  return parseBlocks(text).map((block, i) => {
    if (block.type === "code") {
      return (
        // Focusable so keyboard users can scroll wide code sideways.
        <pre key={i} className="md-code" tabIndex={0}>
          <code>{block.text}</code>
        </pre>
      );
    }
    if (block.type === "ul" || block.type === "ol") {
      const List = block.type;
      return (
        <List key={i}>
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
          ))}
        </List>
      );
    }
    return <p key={i}>{renderInline(block.text, `${i}`)}</p>;
  });
}
