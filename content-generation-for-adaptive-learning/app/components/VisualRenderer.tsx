"use client";

import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

type Props = {
  block: string;
};

export default function VisualRenderer({ block }: Props) {

  const typeMatch = block.match(/type:\s*(\w+)/);
  const type = typeMatch?.[1];

  /* ---------------- FLOW DIAGRAM ---------------- */

  if (type === "flow") {

    const nodes = [...block.matchAll(/id:\s*(\w+)[\s\S]*?label:\s*([^\n]+)/g)]
      .map((match, i) => ({
        id: match[1],
        data: { label: match[2] },
        position: { x: i * 250, y: 0 },
      }));

    const edges = [...block.matchAll(/from:\s*(\w+)[\s\S]*?to:\s*(\w+)/g)]
      .map((match, i) => ({
        id: `e${i}`,
        source: match[1],
        target: match[2],
      }));

    return (
      <div style={{ height: 300 }} className="my-8 border rounded-lg">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  }

  /* ---------------- HIERARCHY DIAGRAM ---------------- */

  if (type === "hierarchy") {

    const rootMatch = block.match(/root:\s*(.+)/);
    const root = rootMatch?.[1] ?? "Root";

    const nodes = [
      {
        id: "root",
        data: { label: root },
        position: { x: 250, y: 0 },
      },
    ];

    const edges: any[] = [];

    const children = [...block.matchAll(/parent:\s*(.+)[\s\S]*?nodes:\s*\[(.+)\]/g)];

    let index = 0;

    children.forEach((child) => {

      const parent = child[1].trim();
      const nodesList = child[2].split(",");

      nodesList.forEach((n) => {

        const id = `node-${index++}`;

        nodes.push({
          id,
          data: { label: n.trim() },
          position: { x: index * 150, y: 150 },
        });

        edges.push({
          id: `edge-${index}`,
          source: parent === root ? "root" : parent,
          target: id,
        });

      });

    });

    return (
      <div style={{ height: 350 }} className="my-8 border rounded-lg">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    );
  }

  /* ---------------- COMPARISON TABLE ---------------- */

  if (type === "comparison") {

    const title = block.match(/title:\s*(.+)/)?.[1];

    const conceptMatches = [...block.matchAll(/name:\s*(.+)/g)].map(m => m[1]);

    const points = [...block.matchAll(/-\s*(.+)/g)].map(m => m[1]);

    return (
      <div className="my-8 border rounded-lg p-4 bg-slate-50">

        <h4 className="font-semibold mb-4">{title}</h4>

        <div className="grid grid-cols-2 gap-6">

          {conceptMatches.map((c, i) => (
            <div key={i} className="bg-white border rounded p-4 shadow-sm">
              <h5 className="font-medium mb-2">{c}</h5>
              <ul className="text-sm space-y-1">
                {points.slice(i * 4, i * 4 + 4).map((p, j) => (
                  <li key={j}>• {p}</li>
                ))}
              </ul>
            </div>
          ))}

        </div>

      </div>
    );
  }

  /* ---------------- CYCLE DIAGRAM ---------------- */

  if (type === "cycle") {

    const steps = [...block.matchAll(/-\s*(.+)/g)].map(m => m[1]);

    return (
      <div className="my-8 flex flex-wrap gap-4 justify-center">

        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">

            <div className="px-4 py-2 bg-blue-100 rounded-lg shadow text-sm">
              {s}
            </div>

            {i < steps.length - 1 && (
              <span className="text-xl">→</span>
            )}

          </div>
        ))}

      </div>
    );
  }

  return null;
}