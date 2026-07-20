import { useEffect, useId, useState } from "react";
import type { default as MermaidApi } from "mermaid";

interface MermaidProps {
  chart: string;
}

// mermaid pulls in its full diagram-rendering engine (flowchart, sequence,
// gantt, cytoscape-based diagrams, etc. — several MB once parsed). Loading it
// only on first actual use keeps that weight out of every note that never
// contains a mermaid block, instead of paying for it on every app start.
let mermaidPromise: Promise<typeof MermaidApi> | null = null;

function getMermaid(): Promise<typeof MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

export function Mermaid({ chart }: MermaidProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMermaid()
      .then((mermaid) => mermaid.render(`mermaid-${id}`, chart))
      .then((result) => {
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return <pre className="mermaid-error">Mermaid error: {error}</pre>;
  }

  if (!svg) {
    return <div className="mermaid-loading">Rendering diagram…</div>;
  }

  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
