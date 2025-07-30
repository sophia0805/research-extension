"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef();

  useEffect(() => {
    if (!query.trim()) {
      setPapers([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/papers?query=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!res.ok) throw new Error("API error");
          return res.json();
        })
        .then((data) => {
          console.log("API response:", data);
          setPapers(data.data || []);
          setLoading(false);
        })
        .catch((err) => {
          setError("Failed to fetch papers");
          setLoading(false);
        });
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSummaryClick = async (idx, paper) => {
    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: paper.title, abstract: paper.abstract, url: paper.url }),
    });
    const data = await res.json();
    setPapers((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, summary: data.summary } : p
      )
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: 0, margin: 0 }}>
      <main style={{ maxWidth: "100vw", margin: "0 auto", padding: "2rem 1rem" }}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Start typing..."
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 150,
            fontSize: 20,
            padding: 16,
            borderRadius: 0,
            marginBottom: 32,
            resize: "vertical",
            boxSizing: "border-box",
            border: 0,
            outline: "none"
          }}
          autoFocus
        />
        {loading && <div>Loading recommendations...</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}
        {papers.length > 0 && (
          <div>
            <h2>Recommended Papers</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {papers.map((paper, idx) => (
                <li
                  key={paper.paperId}
                  style={{
                    marginBottom: 24,
                    padding: 16,
                    background: "#fafbfc",
                  }}
                >
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 18, fontWeight: 600, color: "#0070f3", textDecoration: "none" }}
                  >
                    {paper.title}
                  </a>
                  <div style={{ fontSize: 15, color: "#555", marginTop: 6 }}>
                    {paper.authors && paper.authors.length > 0
                      ? "By " + paper.authors.map((a) => a.name).join(", ")
                      : "No authors listed"}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => handleSummaryClick(idx, paper)}
                      style={{
                        background: "#0070f3",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 16px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Summary
                    </button>
                  </div>
                  {paper.summary && (
                    <div style={{ marginTop: 10, fontSize: 15, color: "#333", background: "#f3f6fa", padding: 12, borderRadius: 6 }}>
                      <ReactMarkdown>{paper.summary}</ReactMarkdown>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
