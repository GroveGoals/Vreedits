"use client";
import ReactMarkdown from "react-markdown";

export default function MarkdownText({ text }) {
  return (
    <div
      style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}
      className="vreedits-markdown"
    >
      <style>{`
        .vreedits-markdown h1, .vreedits-markdown h2, .vreedits-markdown h3 {
          font-family: var(--font-display);
          font-weight: 600;
          margin: 14px 0 6px;
        }
        .vreedits-markdown h1 { font-size: 18px; }
        .vreedits-markdown h2 { font-size: 16px; }
        .vreedits-markdown h3 { font-size: 14px; }
        .vreedits-markdown p { margin: 0 0 10px; }
        .vreedits-markdown ul, .vreedits-markdown ol { margin: 0 0 10px; padding-left: 20px; }
        .vreedits-markdown li { margin-bottom: 4px; }
        .vreedits-markdown strong { font-weight: 600; }
        .vreedits-markdown code {
          background: var(--surface-2);
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 13px;
        }
        .vreedits-markdown pre {
          background: #1a1a1e;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          margin: 10px 0;
          overflow-x: auto;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        .vreedits-markdown pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre;
          color: #e4e4e7;
          font-family: "SF Mono", "Menlo", "Consolas", monospace;
        }
      `}</style>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}