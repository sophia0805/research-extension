"use client";
import { useState, useEffect, useRef } from "react";

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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: paper.title,
        abstract: paper.abstract,
        url: paper.url
      }),
    });
    const data = await res.json();
    setPapers((prev) => prev.map((p, i) => i === idx ? { ...p, summary: data.summary } : p ));
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f5f5f5", 
      padding: 0, 
      margin: 0,
      fontFamily: "nunito"
    }}>
      <div style={{ 
        display: "flex", 
        height: "100vh",
        maxWidth: "100vw"
      }}>
        <div style={{ 
          width: "250px",
          background: "#f5f5f5",
          padding: "1.5rem",
          borderRight: "1px solid #e0e0e0"
        }}>
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ 
              fontSize: "0.875rem", 
              color: "#666", 
              marginBottom: "0.5rem" 
            }}>
            </div>
            <div style={{ 
              fontSize: "1.5rem", 
              fontWeight: "600", 
              color: "#333",
              marginBottom: "2rem"
            }}>
              researcher
            </div>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "1rem" 
            }}>
              <span style={{ 
                fontSize: "1rem", 
                fontWeight: "500", 
                color: "#333" 
              }}>
                Pages
              </span>
              <button style={{
                marginLeft: "0.5rem",
                width: "24px",
                height: "24px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}>
                +
              </button>
            </div>
            <div style={{
              padding: "0.5rem 1rem",
              background: "#0070f3",
              color: "#fff",
              borderRadius: "4px",
              fontSize: "0.875rem",
              display: "inline-block"
            }}>
              Page 1
            </div>
          </div>
        </div>

        <div style={{ 
          flex: "1",
          background: "#fff",
          padding: "2rem",
          borderRight: "1px solid #e0e0e0"
        }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing..."
            spellCheck={false}
            style={{
                width: "100%",
                minHeight: 200,
                fontSize: "1rem",
                padding: "1rem",
                borderRadius: "0",
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: "1.5",
                boxSizing: "border-box",
                border: 0,
                outline: "none"
              }}
            autoFocus
          />

          {loading && (
            <div style={{ 
              marginTop: "1rem", 
              color: "#666",
              fontSize: "0.875rem"
            }}>
              Loading recommendations...
            </div>
          )}
          
          {error && (
            <div style={{ 
              marginTop: "1rem", 
              color: "#dc2626",
              fontSize: "0.875rem"
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ 
          width: "400px",
          background: "#f8f9fa",
          padding: "1.5rem",
          overflowY: "auto"
        }}>
          {papers.length > 0 && (
            <div>
              <h3 style={{ 
                margin: "0 0 1.5rem 0", 
                fontSize: "1.125rem", 
                fontWeight: "600",
                color: "#333"
              }}>
                Recommended Papers
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {papers.map((paper, idx) => (
                  <div key={paper.paperId} style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "1rem",
                    border: "1px solid #e0e0e0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                  }}>
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#0070f3",
                        textDecoration: "none",
                        lineHeight: "1.4",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}
                    >
                      {paper.title}
                    </a>
                    
                    <div style={{
                      fontSize: "0.75rem",
                      color: "#666",
                      marginBottom: "0.75rem"
                    }}>
                      {paper.authors && paper.authors.length > 0 
                        ? paper.authors.map((a) => a.name).join(", ")
                        : "No authors listed"
                      }
                    </div>
                    
                    <button
                      onClick={() => handleSummaryClick(idx, paper)}
                      style={{
                        background: "#0070f3",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "500",
                        fontSize: "0.75rem",
                        float: "right"
                      }}
                    >
                      Summary
                    </button>
                    
                    {paper.summary && (
                      <div style={{
                        marginTop: "0.75rem",
                        fontSize: "0.75rem",
                        color: "#333",
                        background: "#f8f9fa",
                        padding: "0.75rem",
                        borderRadius: "4px",
                        lineHeight: "1.4"
                      }}>
                        {paper.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
