"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inspectResearchFoundation, type ResearchFoundationInspection } from "@/lib/research/researchFoundation";
import { loadResearchFoundationSnapshot } from "@/lib/research/researchFoundationPersistence";
import styles from "./FoundationInspector.module.css";

export default function FoundationInspector({ projectId }: { projectId: string }) {
  const [inspection, setInspection] = useState<ResearchFoundationInspection>(() => inspectResearchFoundation());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await loadResearchFoundationSnapshot(createClient(), projectId);
      setInspection(inspectResearchFoundation(snapshot));
    } catch (cause) {
      setInspection(inspectResearchFoundation());
      setError(cause instanceof Error ? cause.message : "The research foundation could not be inspected.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = [
    ["Artifact families", inspection.registry.artifactKinds],
    ["Dependencies", inspection.graph.dependencies],
    ["Indexed artifacts", inspection.project.indexedArtifacts],
    ["Knowledge entries", inspection.project.knowledgeEntries],
    ["Decision events", inspection.project.decisionEvents],
    ["Assets", inspection.project.assets],
  ] as const;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Advanced project view · Build 0</p>
          <h1>Research foundation inspector</h1>
          <p>Inspect lineage, stale dependencies, knowledge continuity, publication foundations, and privacy boundaries. This is infrastructure—not an extra research stage.</p>
        </div>
        <button disabled={loading} onClick={() => void refresh()} type="button">
          {loading ? "Inspecting…" : "Refresh"}
        </button>
      </header>

      {error ? (
        <div className={styles.notice} role="alert">
          The foundation contracts are available, but project rows could not be loaded. Apply the Build 0 migration in the connected Supabase environment, then refresh. Technical detail: {error}
        </div>
      ) : null}

      <section className={styles.metrics} aria-label="Foundation summary">
        {metrics.map(([label, value]) => (
          <article key={label}><strong>{value}</strong><span>{label}</span></article>
        ))}
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Cross-stage integrity</h2>
          <dl>
            <div><dt>Stages covered</dt><dd>{inspection.registry.stagesCovered.join(" → ")}</dd></div>
            <div><dt>Registry</dt><dd>{inspection.registry.issues.length === 0 ? "Valid" : `${inspection.registry.issues.length} issues`}</dd></div>
            <div><dt>Dependency graph</dt><dd>{inspection.graph.issues.length === 0 ? "Acyclic and reasoned" : `${inspection.graph.issues.length} issues`}</dd></div>
            <div><dt>Route profile</dt><dd>{inspection.project.routeProfilePresent ? "Present" : "Not compiled yet"}</dd></div>
            <div><dt>Canonical manuscript</dt><dd>{inspection.project.manuscriptPresent ? "Present" : "Not created yet"}</dd></div>
          </dl>
        </article>

        <article className={styles.card}>
          <h2>Lifecycle</h2>
          <dl>
            <div><dt>Current</dt><dd>{inspection.project.currentArtifacts}</dd></div>
            <div><dt>Stale</dt><dd>{inspection.project.staleArtifacts}</dd></div>
            <div><dt>Blocked</dt><dd>{inspection.project.blockedArtifacts}</dd></div>
            <div><dt>Template pins</dt><dd>{inspection.project.templatePins}</dd></div>
          </dl>
        </article>

        <article className={styles.card}>
          <h2>Privacy boundary</h2>
          <ul>
            <li>Participant rows: excluded</li>
            <li>Recordings: excluded</li>
            <li>Consent receipts and signatures: excluded</li>
            <li>Uploaded file contents: excluded</li>
          </ul>
          <p>The foundation stores identities, checksums, provenance, aggregate knowledge, and publication metadata only.</p>
        </article>
      </section>
    </main>
  );
}
