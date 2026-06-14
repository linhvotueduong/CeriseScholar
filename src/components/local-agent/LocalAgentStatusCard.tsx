"use client";

import { LOCAL_AGENT_BASE_URL } from "@/lib/local-agent/client";
import { useLocalAgentStatus } from "@/hooks/useLocalAgentStatus";

const statusStyles = {
  checking: {
    border: "#d4cdc5",
    background: "#fbf7f0",
    dot: "#d4a843",
  },
  connected: {
    border: "#9fbe8a",
    background: "#f1f8ed",
    dot: "#5f8f41",
  },
  "needs-ollama": {
    border: "#d8b36f",
    background: "#fff8e8",
    dot: "#c58a47",
  },
  "security-blocked": {
    border: "#d9a0a0",
    background: "#fff5f5",
    dot: "#c0392b",
  },
  "not-connected": {
    border: "#d9a0a0",
    background: "#fff5f5",
    dot: "#c0392b",
  },
};

export default function LocalAgentStatusCard({ compact = false }: { compact?: boolean }) {
  const { ui, health, checking, checkNow, hostedAiBypass } = useLocalAgentStatus();
  const style = statusStyles[ui.status];
  const ollamaReady = hostedAiBypass || Boolean(health?.ollama?.ok ?? health?.ollama?.connected);
  const securityReady = health?.ollama?.security?.ok !== false;

  return (
    <section
      aria-label="Cerise Scholar Local Agent status"
      style={{
        border: `1px solid ${style.border}`,
        background: style.background,
        borderRadius: "12px",
        padding: compact ? "10px 14px" : "14px 16px",
        display: "grid",
        gap: compact ? "8px" : "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          aria-hidden="true"
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            background: style.dot,
            flex: "0 0 auto",
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1208" }}>{ui.label}</div>
          <div style={{ fontSize: "12px", lineHeight: 1.45, color: "#6f6255" }}>{ui.detail}</div>
        </div>
        <button
          type="button"
          onClick={() => void checkNow()}
          disabled={checking}
          style={{
            border: "1px solid #d4cdc5",
            borderRadius: "999px",
            background: "#fff",
            color: "#1a1208",
            cursor: checking ? "default" : "pointer",
            fontSize: "12px",
            fontWeight: 700,
            padding: "7px 10px",
            opacity: checking ? 0.7 : 1,
          }}
        >
          {checking ? "Checking..." : "Check"}
        </button>
      </div>

      {!compact && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "8px",
          }}
        >
          <StatusMini label="Agent" value={hostedAiBypass ? "Hosted AI bypass" : LOCAL_AGENT_BASE_URL.replace(/^https?:\/\//, "")} />
          <StatusMini label="Ollama" value={hostedAiBypass ? "Not required" : ollamaReady ? "Ready" : "Needs setup"} />
          <StatusMini label="Safety" value={securityReady ? "Checked" : "Blocked"} />
          <StatusMini label="Model" value={hostedAiBypass ? "Hosted AI" : health?.ollama?.selectedModel || "Not selected"} />
        </div>
      )}
    </section>
  );
}

function StatusMini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(212, 205, 197, 0.8)",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.58)",
        padding: "8px 10px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "10px", fontWeight: 800, color: "#9a8a7a", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "12px", color: "#1a1208", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}
