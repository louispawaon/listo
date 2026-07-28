import React from "react";
import { createRoot } from "react-dom/client";

function Popup(): React.ReactElement {
  const openEditor = (): void => {
    void chrome.runtime.sendMessage({ type: "OPEN_EDITOR" });
  };

  return (
    <div style={{
      width: 260,
      padding: "16px",
      fontFamily: "system-ui, sans-serif",
      fontSize: 13,
      color: "#1a1a1a",
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
        Listo
      </div>
      <p style={{ margin: "0 0 12px", color: "#555", lineHeight: 1.5 }}>
        Open your Wanderlog trip, then click{" "}
        <strong>Open in Listo</strong> at the bottom-right of the page to start
        editing.
      </p>
      <p style={{ margin: "0 0 12px", color: "#555", lineHeight: 1.5 }}>
        Or open the editor directly to load a saved{" "}
        <span style={{ fontFamily: "monospace" }}>.listo</span> file.
      </p>
      <button
        type="button"
        onClick={openEditor}
        style={{
          display: "block",
          width: "100%",
          padding: "8px 12px",
          marginBottom: 10,
          fontSize: 13,
          fontWeight: 600,
          color: "#ffffff",
          backgroundColor: "#1a1a1a",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Open Listo editor
      </button>
      <div style={{
        fontSize: 11,
        color: "#999",
        borderTop: "1px solid #eee",
        paddingTop: 10,
      }}>
        The in-page button only shows on wanderlog.com/plan/* pages.
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container !== null) {
  createRoot(container).render(<Popup />);
}
