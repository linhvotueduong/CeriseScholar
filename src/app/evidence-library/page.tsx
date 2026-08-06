import AppShell from "@/components/app-shell/AppShell";
import { EvidenceLibraryEmbedded } from "@/components/evidence-library/EvidenceLibraryWorkspace";
import styles from "./page.module.css";

export default function EvidenceLibraryPage() {
  return (
    <AppShell contentClassName={styles.evidenceLibraryMain}>
      <div className={styles.evidenceLibraryViewport} aria-label="Evidence Library">
        <div className={styles.evidenceLibraryStage}>
          <EvidenceLibraryEmbedded embedded={false} />
        </div>
      </div>
    </AppShell>
  );
}
