import React from "react";
import { createRoot } from "react-dom/client";

function Popup(): React.ReactElement {
  return (
    <div style={{
      width: 220,
      padding: "16px",
      fontFamily: "system-ui, sans-serif",
      fontSize: 13,
      color: "#1a1a1a",
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
        Wanderlog Exporter
      </div>
      <p style={{ margin: "0 0 12px", color: "#555", lineHeight: 1.5 }}>
        Open your Wanderlog trip plan, then click the{" "}
        <strong>⬇ Export PDF</strong> button at the bottom-right of the page.
      </p>
      <div style={{
        fontSize: 11,
        color: "#999",
        borderTop: "1px solid #eee",
        paddingTop: 10,
      }}>
        Only works on wanderlog.com/plan/* pages.
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container !== null) {
  createRoot(container).render(<Popup />);
}
