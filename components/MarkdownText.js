"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, Maximize2, X } from "lucide-react";

function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const codeText = String(children).replace(/\n$/, "");
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "code";

  function handleCopy() {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <div style={{ margin: "10px 0", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 10px", background: "#232326", borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 11, color: "#9a9aa5" }}>{language}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleCopy}
              aria-label="Copy code"
              style={{ background: "none", border: "none", color: "#9a9aa5", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => setExpanded(true)}
              aria-label="Expand code"
              style={{ background: "none", border: "none", color: "#9a9aa5", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        <pre style={{ margin: 0, padding: 14, background: "#1a1a1e", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <code style={{ fontFamily: '"SF Mono","Menlo","Consolas",monospace', fontSize: 13, lineHeight: 1.5, color: "#e4e4e7", whiteSpace: "pre" }}>
            {codeText}
          </code>
        </pre>
      </div>

      {expanded && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column" }}
          onClick={() => setExpanded(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: "auto", width: "94vw", maxHeight: "84vh", background: "#1a1a1e",
              borderRadius: 12, border: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#232326", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "#9a9aa5" }}>{language}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleCopy} aria-label="Copy code" style={{ background: "none", border: "none", color: "#9a9aa5", padding: 4 }}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button onClick={() => setExpanded(false)} aria-label="Close" style={{ background: "none", border: "none", color: "#9a9aa5", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <pre style={{ margin: 0, padding: 16, overflow: "auto", flex: 1 }}>
              <code style={{ fontFamily: '"SF Mono","Menlo","Consolas",monospace', fontSize: 13, lineHeight: 1.6, color: "#e4e4e7", whiteSpace: "pre" }}>
                {codeText}
              </code>
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

export default function MarkdownText({ text }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }} className="vreedits-markdown">
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
      `}</style>
      <ReactMarkdown
        components={{
          code({ inline, className, children, ...props }) {
            if (inline) {
              return (
                <code style={{ background: "var(--surface-2)", padding: "2px 5px", borderRadius: 4, fontSize: 13 }} {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}