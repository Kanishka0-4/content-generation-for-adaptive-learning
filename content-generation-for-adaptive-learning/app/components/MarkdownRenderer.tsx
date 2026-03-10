"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VisualRenderer from "./VisualRenderer";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {

  /* -------- CLEAN GENERATED HEADINGS -------- */

  const cleaned = content
    .replace(/###\s*1\.\s*Hook.*\n?/gi, "")
    .replace(/###\s*2\.\s*Concept.*\n?/gi, "")
    .replace(/###\s*3\.\s*Concept.*\n?/gi, "")
    .replace(/###\s*4\.\s*Visual.*\n?/gi, "")
    .replace(/###\s*5\.\s*Worked.*\n?/gi, "")
    .replace(/###\s*6\.\s*Scenario.*\n?/gi, "")
    .replace(/###\s*7\.\s*Key.*\n?/gi, "")
    .replace(
      /\*\*\d+\.\s*(Hook|Concept Explanation|Concept Breakdown|Visualiz\w+|Worked Example|Scenario|Key Takeaways)[^*]*\*\*\n?/gi,
      ""
    );

  /* -------- SPLIT VISUAL BLOCKS -------- */

  const parts = cleaned.split(/\[VISUAL\]([\s\S]*?)\[\/VISUAL\]/g);

  return (
    <div className="max-w-3xl mx-auto px-2 py-8">

      {parts.map((part, index) => {

        /* VISUAL BLOCK */

        if (index % 2 === 1) {
          return <VisualRenderer key={index} block={part} />;
        }

        /* NORMAL MARKDOWN */

        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            components={{

              h1: ({ ...props }) => (
                <h1
                  className="text-3xl font-bold mb-6 text-slate-900 tracking-tight leading-tight"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  {...props}
                />
              ),

              h2: ({ ...props }) => (
                <h2
                  className="text-xl font-semibold mt-10 mb-4 text-slate-800 border-b border-slate-200 pb-2"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  {...props}
                />
              ),

              h3: ({ ...props }) => (
                <h3
                  className="text-base font-semibold mt-7 mb-2 text-slate-700"
                  {...props}
                />
              ),

              p: ({ ...props }) => (
                <p
                  className="text-slate-700 leading-[1.85] mb-5 text-[15px]"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  {...props}
                />
              ),

              ul: ({ ...props }) => (
                <ul className="mb-5 ml-1 space-y-2" {...props} />
              ),

              ol: ({ ...props }) => (
                <ol className="mb-5 ml-1 space-y-2 list-decimal list-inside" {...props} />
              ),

              li: ({ children, ...props }) => (
                <li
                  className="text-slate-700 text-[15px] leading-relaxed flex gap-2"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  {...props}
                >
                  <span className="mt-[6px] text-amber-500 flex-shrink-0 text-xs">▸</span>
                  <span>{children}</span>
                </li>
              ),

              blockquote: ({ ...props }) => (
                <blockquote
                  className="border-l-4 border-amber-400 pl-5 py-1 my-6 bg-amber-50 rounded-r-md italic text-slate-600 text-[15px]"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  {...props}
                />
              ),

              strong: ({ ...props }) => (
                <strong className="font-semibold text-slate-900" {...props} />
              ),

              hr: () => (
                <hr className="my-8 border-slate-200" />
              ),

              table: ({ ...props }) => (
                <div className="overflow-x-auto my-6">
                  <table className="w-full text-sm border-collapse" {...props} />
                </div>
              ),

              th: ({ ...props }) => (
                <th
                  className="text-left px-4 py-2 bg-slate-100 border border-slate-200 font-semibold text-slate-700 text-xs uppercase tracking-wide"
                  {...props}
                />
              ),

              td: ({ ...props }) => (
                <td className="px-4 py-2 border border-slate-200 text-slate-700 text-[14px]" {...props} />
              ),

              code({ children, className }) {

                if (!className) {
                  return (
                    <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[13px] font-mono border border-slate-200">
                      {children}
                    </code>
                  );
                }

                return (
                  <pre className="bg-slate-900 text-slate-100 p-5 rounded-xl overflow-x-auto my-5 text-[13px] leading-relaxed font-mono border border-slate-800">
                    <code>{children}</code>
                  </pre>
                );
              },

            }}
          >
            {part}
          </ReactMarkdown>
        );

      })}

    </div>
  );
}