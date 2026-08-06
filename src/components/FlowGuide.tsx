"use client";

import { useState, useEffect } from "react";

interface FlowStep {
  index: number;
  title: string;
  tag: string;
  route: string;
}

const palette = {
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  cerise: "#c0392b",
  rule: "#e0d8d0",
  gold: "#c8a84b",
};

export default function FlowGuide() {
  const [flow, setFlow] = useState<FlowStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cerise-flow");
    const step = localStorage.getItem("cerise-flow-step");
    if (stored) {
      const parsed = JSON.parse(stored) as FlowStep[];
      const initializationTimer = window.setTimeout(() => {
        setFlow(parsed);
        setCurrentStep(step ? parseInt(step, 10) : 0);
      }, 0);
      // Show popup after a short delay
      const timer = setTimeout(() => setShow(true), 800);
      return () => {
        clearTimeout(initializationTimer);
        clearTimeout(timer);
      };
    }
  }, []);

  const goToNext = () => {
    if (currentStep < flow.length) {
      const nextRoute = flow[currentStep].route;
      localStorage.setItem("cerise-flow-step", String(currentStep + 1));
      window.location.href = nextRoute;
    }
  };

  const endFlow = () => {
    localStorage.removeItem("cerise-flow");
    localStorage.removeItem("cerise-flow-step");
    setDismissed(true);
    setShow(false);
  };

  if (!show || dismissed || flow.length === 0) return null;

  // All steps done
  if (currentStep >= flow.length) {
    return (
      <div style={{
        position: "fixed", bottom: "24px", right: "24px",
        background: "#fff", borderRadius: "14px",
        padding: "20px 24px", width: "320px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        border: `1.5px solid #22c55e`,
        zIndex: 1000,
        animation: "slideUp 0.3s ease-out",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.1em" }}>✓ All done!</span>
          <button onClick={endFlow} style={{ background: "none", border: "none", fontSize: "14px", color: palette.inkMuted, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: palette.ink, marginBottom: "4px" }}>
          Research journey complete
        </div>
        <div style={{ fontSize: "11px", color: palette.inkMuted, marginBottom: "12px" }}>
          You&apos;ve visited all {flow.length} selected steps. Happy researching!
        </div>
        <button onClick={endFlow} style={{ width: "100%", padding: "10px", borderRadius: "100px", border: "none", background: "#22c55e", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
          Finish ✓
        </button>
      </div>
    );
  }

  const nextStep = flow[currentStep];
  const remaining = flow.length - currentStep;

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px",
      background: "#fff", borderRadius: "14px",
      padding: "20px 24px", width: "320px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      border: `1.5px solid ${palette.rule}`,
      zIndex: 1000,
      animation: "slideUp 0.3s ease-out",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: palette.gold, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          ★ Step {currentStep + 1} of {flow.length}
        </span>
        <button onClick={endFlow} style={{ background: "none", border: "none", fontSize: "14px", color: palette.inkMuted, cursor: "pointer" }}>✕</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: "4px", background: palette.rule, borderRadius: "2px", marginBottom: "12px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(currentStep / flow.length) * 100}%`, background: palette.gold, borderRadius: "2px", transition: "width 0.3s" }} />
      </div>

      {/* Next step info */}
      <div style={{ fontSize: "14px", fontWeight: 600, color: palette.ink, marginBottom: "4px" }}>
        Next up: {nextStep.title}
      </div>
      <div style={{ fontSize: "11px", color: palette.inkMuted, marginBottom: "14px" }}>
        {nextStep.tag} · {remaining} step{remaining !== 1 ? "s" : ""} remaining
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={goToNext}
          style={{
            flex: 1, padding: "10px",
            borderRadius: "100px", border: "none",
            background: palette.ink, color: "#fff",
            fontSize: "12px", fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Continue →
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            padding: "10px 16px",
            borderRadius: "100px",
            border: `1px solid ${palette.rule}`,
            background: "transparent", color: palette.inkMuted,
            fontSize: "11px", fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
