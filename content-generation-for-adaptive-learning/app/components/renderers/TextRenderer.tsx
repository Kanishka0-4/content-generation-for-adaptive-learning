"use client";

import ReactMarkdown from "react-markdown";

interface TextRendererProps {
  block: string;
}

export default function TextRenderer({ block }: TextRendererProps) {

  return (
    <div className="prose max-w-none">
      <ReactMarkdown>{block}</ReactMarkdown>
    </div>
  );
}