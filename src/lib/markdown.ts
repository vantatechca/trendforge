import * as React from "react";

type Node =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "code"; code: string };

function parse(md: string): Node[] {
  const out: Node[] = [];
  if (!md) return out;

  // Pull out fenced code first (no nested parsing)
  const parts: { kind: "text" | "code"; value: string }[] = [];
  const fence = /```([\s\S]*?)```/g;
  const matches = Array.from(md.matchAll(fence));
  let cursor = 0;
  for (const m of matches) {
    const idx = m.index ?? 0;
    if (idx > cursor) parts.push({ kind: "text", value: md.slice(cursor, idx) });
    parts.push({ kind: "code", value: (m[1] ?? "").trim() });
    cursor = idx + m[0].length;
  }
  if (cursor < md.length) parts.push({ kind: "text", value: md.slice(cursor) });

  for (const part of parts) {
    if (part.kind === "code") {
      out.push({ type: "code", code: part.value });
      continue;
    }
    const lines = part.value.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { out.push({ type: "h", level: h[1].length, text: h[2] }); i++; continue; }
      if (line.startsWith("> ")) {
        const buf: string[] = [];
        while (i < lines.length && lines[i].startsWith("> ")) { buf.push(lines[i].slice(2)); i++; }
        out.push({ type: "blockquote", text: buf.join(" ") });
        continue;
      }
      if (/^\s*[-*+]\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
          i++;
        }
        out.push({ type: "ul", items });
        continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
          i++;
        }
        out.push({ type: "ol", items });
        continue;
      }
      const buf: string[] = [];
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !lines[i].startsWith("> ")
      ) { buf.push(lines[i]); i++; }
      out.push({ type: "p", text: buf.join(" ") });
    }
  }
  return out;
}

function renderInline(s: string, parentKey: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = s;
  let key = 0;

  const patterns: { re: RegExp; render: (m: RegExpMatchArray, k: string) => React.ReactNode }[] = [
    { re: /`([^`]+)`/, render: (m, k) => React.createElement("code", { key: k }, m[1]) },
    { re: /\*\*([^*]+)\*\*/, render: (m, k) => React.createElement("strong", { key: k }, m[1]) },
    { re: /\*([^*]+)\*/, render: (m, k) => React.createElement("em", { key: k }, m[1]) },
    {
      re: /\[([^\]]+)\]\(([^)]+)\)/,
      render: (m, k) => {
        const url = m[2];
        const safe = /^(https?:|mailto:|\/)/i.test(url) ? url : "#";
        return React.createElement(
          "a",
          { key: k, href: safe, target: "_blank", rel: "noopener noreferrer" },
          m[1],
        );
      },
    },
  ];

  while (rest.length) {
    let earliest: { idx: number; len: number; node: React.ReactNode } | null = null;
    for (const p of patterns) {
      const m = rest.match(p.re);
      if (m && m.index !== undefined) {
        if (!earliest || m.index < earliest.idx) {
          const k = `${parentKey}-${key++}`;
          earliest = { idx: m.index, len: m[0].length, node: p.render(m, k) };
        }
      }
    }
    if (!earliest) {
      out.push(rest);
      break;
    }
    if (earliest.idx > 0) out.push(rest.slice(0, earliest.idx));
    out.push(earliest.node);
    rest = rest.slice(earliest.idx + earliest.len);
  }
  return out;
}

export function MarkdownView({ md, className }: { md: string; className?: string }) {
  const nodes = parse(md);
  return React.createElement(
    "div",
    { className: `markdown ${className ?? ""}`.trim() },
    nodes.map((n, i) => {
      switch (n.type) {
        case "h":
          return React.createElement(`h${n.level}`, { key: i }, ...renderInline(n.text, `h${i}`));
        case "p":
          return React.createElement("p", { key: i }, ...renderInline(n.text, `p${i}`));
        case "ul":
          return React.createElement(
            "ul",
            { key: i },
            n.items.map((it, j) => React.createElement("li", { key: j }, ...renderInline(it, `li${i}-${j}`))),
          );
        case "ol":
          return React.createElement(
            "ol",
            { key: i },
            n.items.map((it, j) => React.createElement("li", { key: j }, ...renderInline(it, `oli${i}-${j}`))),
          );
        case "blockquote":
          return React.createElement("blockquote", { key: i }, ...renderInline(n.text, `q${i}`));
        case "code":
          return React.createElement("pre", { key: i }, React.createElement("code", null, n.code));
      }
    }),
  );
}
