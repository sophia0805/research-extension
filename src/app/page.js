"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([{ id: 1, name: "Page 1", content: "" }]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPage, setEditingPage] = useState(null);
  const [editingName, setEditingName] = useState("");
  const debounceRef = useRef();

  const currentPageData = pages.find((page) => page.id === currentPage);

  useEffect(() => {
    if (!currentPageData?.content?.trim()) {
      setPapers([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/papers?query=${encodeURIComponent(currentPageData.content)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPapers(data.data || []);
      } catch {
        setError("Failed to fetch papers");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [currentPageData?.content]);

  const summarizePaper = async (idx, paper) => {
    const res = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: paper.title,
        abstract: paper.abstract,
        url: paper.url,
      }),
    });
    const data = await res.json();
    setPapers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, summary: data.summary } : p))
    );
  };

  const addPage = () => {
    const newPageId = Math.max(...pages.map((p) => p.id)) + 1;
    const newPage = { id: newPageId, name: `Page ${newPageId}`, content: "" };
    setPages([...pages, newPage]);
    setCurrentPage(newPageId);
  };

  const updatePage = (content) => {
    setPages(
      pages.map((page) =>
        page.id === currentPage ? { ...page, content } : page
      )
    );
  };

  const deletePage = () => {
    if (pages.length > 1) {
      const newPages = pages.filter(page => page.id !== currentPage);
      setPages(newPages);
      setCurrentPage(newPages[0].id);
    }
  };

  const editPage = (pageId, currentName) => {
    setEditingPage(pageId);
    setEditingName(currentName);
  };

  const savePage = () => {
    if (editingName.trim()) {
      setPages(pages.map(page => 
        page.id === editingPage 
          ? { ...page, name: editingName.trim() } 
          : page
      ));
    }
    setEditingPage(null);
    setEditingName("");
  };

  const renamePage = (event) => {
    if (event.key === 'Enter') {
      savePage();
    } else if (event.key === 'Escape') {
      setEditingPage(null);
      setEditingName("");
    }
  };

  useEffect(() => {
    const keyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'INPUT') {
          deletePage();
        }
      }
    };

    document.addEventListener('keydown', keyDown);
    return () => document.removeEventListener('keydown', keyDown);
  }, [currentPage, pages]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "nunito" }}>
      <div
        style={{
          width: 250,
          background: "#f5f5f5",
          padding: "1.5rem",
          borderRight: "1px solid #e0e0e0",
        }}
      >
        <div style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "2rem" }}>
          researcher
        </div>
        <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontWeight: 500 }}>Pages</span>
              <button
                onClick={addPage}
                style={{
                  marginLeft: "0.5rem",
                  width: 24,
                  height: 24,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {pages.map((page) => (
                <div key={page.id}>
                  {editingPage === page.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={renamePage}
                      onBlur={savePage}
                      style={{
                        width: "100%",
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        border: "1px solid #0070f3",
                        borderRadius: 4,
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setCurrentPage(page.id)}
                      onDoubleClick={() => editPage(page.id, page.name)}
                      style={{
                        padding: "0.5rem 1rem",
                        background: page.id === currentPage ? "#0070f3" : "transparent",
                        color: page.id === currentPage ? "#fff" : "#333",
                        borderRadius: 4,
                        fontSize: "0.875rem",
                        border: page.id === currentPage ? "none" : "1px solid #ddd",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      {page.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
        </div>
      </div>
      <div style={{ flex: 1, background: "#fff", padding: "2rem" }}>
        <textarea
          value={currentPageData?.content || ""}
          onChange={(e) => updatePage(e.target.value)}
          placeholder="Start typing..."
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 200,
            fontSize: "1rem",
            padding: "1rem",
            resize: "vertical",
            lineHeight: 1.5,
            border: 0,
            outline: "none",
            fontFamily: "inherit",
          }}
          autoFocus
        />
        {loading && <div style={{ marginTop: "1rem", color: "#666" }}>Loading recommendations...</div>}
        {error && <div style={{ marginTop: "1rem", color: "#dc2626" }}>{error}</div>}
      </div>
      <div style={{ width: 400, background: "#f8f9fa", padding: "1.5rem", overflowY: "auto" }}>
        {papers.length > 0 && (
          <>
            <h3 style={{ marginBottom: "1.5rem", fontSize: "1.125rem", fontWeight: 600 }}>
              Recommended Papers
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {papers.map((paper, idx) => (
                <div
                  key={paper.paperId}
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: "1rem",
                    border: "1px solid #e0e0e0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0070f3", textDecoration: "none" }}
                  >
                    {paper.title}
                  </a>
                  <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.75rem" }}>
                    {paper.authors?.length ? paper.authors.map((a) => a.name).join(", ") : "No authors listed"}
                  </div>
                  <button
                    onClick={() => summarizePaper(idx, paper)}
                    style={{
                      background: "#0070f3",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "0.5rem 1rem",
                      cursor: "pointer",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                      float: "right",
                    }}
                  >
                    Summary
                  </button>
                  {paper.summary && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        fontSize: "0.75rem",
                        color: "#333",
                        background: "#f8f9fa",
                        padding: "0.75rem",
                        borderRadius: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {paper.summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
