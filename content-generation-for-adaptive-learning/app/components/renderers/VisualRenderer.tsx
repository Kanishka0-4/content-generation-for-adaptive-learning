"use client";

interface VisualProps { block: string; }

/* ══════════════════════════════════════════════════════
   PARSER  — strips metadata, returns clean top-level items
══════════════════════════════════════════════════════ */

function getMeta(block: string) {
  const type  = block.match(/^type:\s*(.+)/m)?.[1]?.trim() ?? "";
  const title = block.match(/^title:\s*(.+)/m)?.[1]?.trim() ?? "";
  return { type, title };
}

/** Returns the raw text after stripping type/title/data: lines */
function dataBody(block: string) {
  return block
    .replace(/^type:[^\n]*\n?/m, "")
    .replace(/^title:[^\n]*\n?/m, "")
    .replace(/^data:\s*\n?/m, "");
}

/**
 * Splits the data body into top-level items.
 * A top-level item starts with "- " at column 0 (no leading spaces).
 */
function splitTopLevel(body: string): string[] {
  const items: string[] = [];
  let buf: string[] = [];

  for (const line of body.split("\n")) {
    if (/^- /.test(line) && buf.length > 0) {
      items.push(buf.join("\n").trim());
      buf = [];
    }
    buf.push(line);
  }
  if (buf.join("").trim()) items.push(buf.join("\n").trim());
  return items.filter(Boolean);
}

/** Extract a scalar key from within a raw item block */
function scalar(raw: string, key: string) {
  return raw.match(new RegExp(`^\\s*${key}:\\s*(.+)`, "m"))?.[1]?.trim() ?? "";
}

/** Extract a flat YAML list under a given key */
function subList(raw: string, key: string): string[] {
  const keyIdx = raw.search(new RegExp(`^\\s*${key}:`, "m"));
  if (keyIdx === -1) return [];
  const after = raw.slice(keyIdx);
  const lines = after.split("\n").slice(1);
  const result: string[] = [];
  for (const l of lines) {
    if (/^\s{2,}- /.test(l)) result.push(l.replace(/^\s+- /, "").trim());
    else if (l.trim() && !/^\s/.test(l)) break;
  }
  return result;
}

function parseItem(raw: string) {
  const header = raw.split("\n")[0].replace(/^-\s*/, "").trim();
  return {
    raw,
    header,
    name:           scalar(raw, "name")         || header,
    description:    scalar(raw, "description"),
    concept:        scalar(raw, "concept")       || header,
    step:           scalar(raw, "step")          || header,
    application:    scalar(raw, "application"),
    visual_example: scalar(raw, "visual_example"),
    features:       subList(raw, "features"),
    steps:          subList(raw, "steps"),
  };
}

/* helper: pick best label from a parsed item */
function bestLabel(item: ReturnType<typeof parseItem>) {
  if (item.step   && item.step   !== item.header) return item.step;
  if (item.concept && item.concept !== item.header) return item.concept;
  return item.name;
}

/* ══════════════════════════════════════════════════════
   HIERARCHY  — recursive indent-aware tree parser
══════════════════════════════════════════════════════ */

interface TreeNode { name: string; description: string; children: TreeNode[]; }

function parseTree(block: string): TreeNode[] {
  const lines = dataBody(block).split("\n");

  function walk(from: number, minIndent: number): { nodes: TreeNode[]; next: number } {
    const nodes: TreeNode[] = [];
    let i = from;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      const indent = line.search(/\S/);
      if (indent < minIndent) break;

      if (line.trim().startsWith("- name:")) {
        const name = line.trim().replace(/^- name:\s*/, "");
        let description = "";
        let j = i + 1;

        while (j < lines.length) {
          const nl = lines[j];
          if (!nl.trim()) { j++; continue; }
          const ni = nl.search(/\S/);
          if (ni <= indent) break;
          const dm = nl.trim().match(/^description:\s*(.+)/);
          if (dm) { description = dm[1].trim(); }
          if (nl.trim() === "children:") { j++; break; }
          j++;
        }

        const { nodes: children, next } = walk(j, indent + 2);
        nodes.push({ name, description, children });
        i = next;
      } else {
        i++;
      }
    }
    return { nodes, next: i };
  }

  return walk(0, 0).nodes;
}

/* ══════════════════════════════════════════════════════
   FLOW  ── vertical numbered timeline
   Identity: indigo spine, white cards
══════════════════════════════════════════════════════ */

function FlowVisual({ title, block }: { title: string; block: string }) {
  const items = splitTopLevel(dataBody(block)).map(parseItem);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {title && (
        <h3 style={{ margin: "0 0 1.4rem", fontSize: "1.05rem", fontWeight: 700, color: "#1e1b4b" }}>
          {title}
        </h3>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item, i) => {
          const label = bestLabel(item);
          const desc  = item.description || item.application;
          const subs  = item.steps.length ? item.steps : item.features;
          const last  = i === items.length - 1;

          return (
            <div key={i} style={{ display: "flex", gap: "0.9rem" }}>
              {/* spine */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#6366f1,#818cf8)",
                  color: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "0.78rem", fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(99,102,241,.3)",
                }}>{i + 1}</div>
                {!last && (
                  <div style={{
                    width: 2, flex: 1, minHeight: 24,
                    background: "linear-gradient(#a5b4fc,#e0e7ff)",
                    margin: "3px 0",
                  }} />
                )}
              </div>

              {/* card */}
              <div style={{
                flex: 1, background: "#fff",
                border: "1px solid #e0e7ff", borderRadius: 12,
                padding: "0.8rem 1.1rem",
                marginBottom: last ? 0 : "0.4rem",
                boxShadow: "0 1px 6px rgba(99,102,241,.07)",
              }}>
                <div style={{ fontWeight: 600, color: "#312e81", fontSize: "0.9rem", lineHeight: 1.35 }}>
                  {label}
                </div>
                {desc && (
                  <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "0.3rem", lineHeight: 1.55 }}>
                    {desc}
                  </div>
                )}
                {subs.length > 0 && (
                  <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
                    {subs.map((s, si) => (
                      <li key={si} style={{ fontSize: "0.8rem", color: "#4b5563", marginBottom: "0.2rem" }}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HIERARCHY  ── indented tree, depth-shifting colour
   Identity: violet→blue→teal→green, left-border nodes
══════════════════════════════════════════════════════ */

const DEPTH_PALETTE = [
  { accent: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", text: "#3b0764" },
  { accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", text: "#1e3a8a" },
  { accent: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", text: "#164e63" },
  { accent: "#059669", bg: "#f0fdf4", border: "#a7f3d0", text: "#064e3b" },
];

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const c = DEPTH_PALETTE[Math.min(depth, DEPTH_PALETTE.length - 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: node.children.length ? "0.25rem" : "0.45rem" }}>
        {/* indent + connector */}
        {depth > 0 && (
          <div style={{ width: depth * 26, flexShrink: 0, position: "relative", alignSelf: "stretch" }}>
            <div style={{
              position: "absolute", left: depth * 26 - 14,
              top: 0, bottom: 0, width: 2,
              background: `${c.accent}30`,
            }} />
            <div style={{
              position: "absolute", left: depth * 26 - 14,
              top: 18, width: 12, height: 2,
              background: `${c.accent}50`,
            }} />
          </div>
        )}

        {/* node */}
        <div style={{
          flex: 1, background: c.bg,
          border: `1px solid ${c.border}`,
          borderLeft: `3px solid ${c.accent}`,
          borderRadius: "0 10px 10px 0",
          padding: "0.55rem 0.95rem",
          boxShadow: `0 1px 4px ${c.accent}10`,
        }}>
          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: c.text }}>{node.name}</div>
          {node.description && (
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem", lineHeight: 1.5 }}>
              {node.description}
            </div>
          )}
        </div>
      </div>

      {node.children.map((child, ci) => (
        <TreeRow key={ci} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function HierarchyVisual({ title, block }: { title: string; block: string }) {
  const isTree = block.includes("name:");

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {title && (
        <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.05rem", fontWeight: 700, color: "#3b0764" }}>
          {title}
        </h3>
      )}

      {isTree ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {parseTree(block).map((node, i) => (
            <TreeRow key={i} node={node} depth={0} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {splitTopLevel(dataBody(block)).map((raw, i) => {
            const item = parseItem(raw);
            const label = bestLabel(item);
            const c = DEPTH_PALETTE[i % DEPTH_PALETTE.length];
            return (
              <div key={i} style={{
                display: "flex", gap: "0.75rem", alignItems: "flex-start",
                background: c.bg, border: `1px solid ${c.border}`,
                borderLeft: `3px solid ${c.accent}`,
                borderRadius: "0 10px 10px 0", padding: "0.6rem 1rem",
              }}>
                <div style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                  background: c.accent, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.65rem", fontWeight: 700,
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: c.text }}>{label}</div>
                  {item.description && (
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.2rem", lineHeight: 1.5 }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   COMPARISON  ── colour-coded side-by-side panels
   Identity: sky/amber/emerald/violet, top accent bar, letter badge
══════════════════════════════════════════════════════ */

const COMPARE_COLORS = [
  { accent: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e" },
  { accent: "#f59e0b", bg: "#fffbeb", border: "#fde68a", text: "#78350f" },
  { accent: "#10b981", bg: "#f0fdf4", border: "#a7f3d0", text: "#064e3b" },
  { accent: "#8b5cf6", bg: "#faf5ff", border: "#ddd6fe", text: "#4c1d95" },
];

function ComparisonVisual({ title, block }: { title: string; block: string }) {
  const items = splitTopLevel(dataBody(block)).map(parseItem);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {title && (
        <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.05rem", fontWeight: 700, color: "#0c4a6e" }}>
          {title}
        </h3>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(items.length, 2)}, 1fr)`,
        gap: "0.85rem",
      }}>
        {items.map((item, i) => {
          const c = COMPARE_COLORS[i % COMPARE_COLORS.length];
          const label = bestLabel(item);
          const feats = item.features.length
            ? item.features
            : subList(item.raw, "features");
          const example = item.visual_example;

          return (
            <div key={i} style={{
              background: c.bg, border: `1.5px solid ${c.border}`,
              borderRadius: 14, padding: "1.1rem 1.2rem",
              position: "relative", overflow: "hidden",
            }}>
              {/* top bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0,
                height: 3, background: c.accent,
              }} />

              {/* letter badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: "50%",
                background: c.accent, color: "#fff",
                fontSize: "0.65rem", fontWeight: 800,
                marginBottom: "0.55rem",
              }}>{String.fromCharCode(65 + i)}</div>

              <div style={{ fontWeight: 700, color: c.text, fontSize: "0.92rem", lineHeight: 1.3, marginBottom: "0.55rem" }}>
                {label}
              </div>

              {feats.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: "1.1rem", marginBottom: example ? "0.65rem" : 0 }}>
                  {feats.map((f, fi) => (
                    <li key={fi} style={{ fontSize: "0.8rem", color: "#374151", marginBottom: "0.22rem", lineHeight: 1.5 }}>
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              {example && (
                <div style={{
                  marginTop: "0.65rem", background: "#fff",
                  border: `1px solid ${c.border}`, borderRadius: 8,
                  padding: "0.45rem 0.75rem",
                  fontFamily: "'JetBrains Mono','Fira Code',monospace",
                  fontSize: "0.74rem", color: c.text, wordBreak: "break-all",
                }}>{example}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CYCLE  ── pill chain header + detail rows
   Identity: emerald wrapper, multi-colour pills, ↩ loop indicator
══════════════════════════════════════════════════════ */

const CYCLE_PALETTE = ["#6366f1","#8b5cf6","#0891b2","#059669","#d97706","#dc2626"];

function CycleVisual({ title, block }: { title: string; block: string }) {
  const items = splitTopLevel(dataBody(block)).map(parseItem);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {title && (
        <h3 style={{ margin: "0 0 1.4rem", fontSize: "1.05rem", fontWeight: 700, color: "#064e3b" }}>
          {title}
        </h3>
      )}

      {/* pill chain */}
      <div style={{
        display: "flex", flexWrap: "wrap",
        alignItems: "center", gap: "0.3rem",
        marginBottom: "1.25rem",
      }}>
        {items.map((item, i) => {
          const label = bestLabel(item);
          const color = CYCLE_PALETTE[i % CYCLE_PALETTE.length];
          return (
            <div key={i} style={{ display: "contents" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                background: color + "15", border: `1.5px solid ${color}40`,
                borderRadius: 999, padding: "0.42rem 0.85rem",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.65rem", fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color, whiteSpace: "nowrap" }}>
                  {label}
                </span>
              </div>
              {i < items.length - 1 && (
                <span style={{ color: "#9ca3af", fontSize: "0.88rem" }}>→</span>
              )}
            </div>
          );
        })}
        <span style={{ color: "#6b7280", fontSize: "0.88rem", marginLeft: "0.15rem" }}>↩</span>
      </div>

      {/* detail rows (only if any have descriptions) */}
      {items.some(it => it.description || it.application) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {items.map((item, i) => {
            const label = bestLabel(item);
            const desc  = item.description || item.application;
            const color = CYCLE_PALETTE[i % CYCLE_PALETTE.length];
            if (!desc) return null;
            return (
              <div key={i} style={{
                display: "flex", gap: "0.7rem", alignItems: "flex-start",
                background: "#fff", border: `1px solid ${color}25`,
                borderLeft: `3px solid ${color}`,
                borderRadius: "0 10px 10px 0", padding: "0.55rem 0.95rem",
              }}>
                <div style={{
                  flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
                  background: color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.63rem", fontWeight: 700,
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color, marginBottom: "0.1rem" }}>{label}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN EXPORT  — each type gets its own wrapper colour
══════════════════════════════════════════════════════ */

const WRAP_STYLES: Record<string, React.CSSProperties> = {
  flow:       { background: "#f8f9ff", border: "1px solid #e0e7ff", borderTop: "3px solid #6366f1" },
  hierarchy:  { background: "#faf8ff", border: "1px solid #ede9fe", borderTop: "3px solid #7c3aed" },
  comparison: { background: "#f0f9ff", border: "1px solid #bae6fd", borderTop: "3px solid #0ea5e9" },
  cycle:      { background: "#f0fdf6", border: "1px solid #a7f3d0", borderTop: "3px solid #059669" },
};

export default function VisualRenderer({ block }: VisualProps) {
  const { type, title } = getMeta(block);

  const base: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 14,
    padding: "1.4rem 1.6rem",
    marginTop: "0.25rem",
    boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
    overflow: "hidden",
    ...(WRAP_STYLES[type] ?? {}),
  };

  if (type === "flow")
    return <div style={base}><FlowVisual       title={title} block={block} /></div>;
  if (type === "hierarchy")
    return <div style={base}><HierarchyVisual  title={title} block={block} /></div>;
  if (type === "comparison")
    return <div style={base}><ComparisonVisual title={title} block={block} /></div>;
  if (type === "cycle")
    return <div style={base}><CycleVisual      title={title} block={block} /></div>;

  return (
    <div style={{ ...base, background: "#fff1f2", border: "1px solid #fecaca", borderTop: "3px solid #dc2626" }}>
      <span style={{ color: "#dc2626", fontSize: "0.85rem" }}>
        Unsupported visual type: <strong>{type || "(none)"}</strong>
      </span>
    </div>
  );
}