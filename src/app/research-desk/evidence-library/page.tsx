"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Papa from "papaparse";
import AppShell from "@/components/app-shell/AppShell";
import Spinner from "@/components/ui/Spinner";
import { useUser } from "@/hooks/useUser";
import { useResearchDeskData } from "@/hooks/useResearchDeskData";
import { useEvidenceLibrary } from "@/hooks/useEvidenceLibrary";
import type { EvidenceLibraryRow } from "@/lib/research/evidenceLibrary";
import { formatRelativeTime } from "@/lib/research/researchDeskDerive";
import styles from "./page.module.css";

type SourceFilter = "all" | "scholarask" | "upload";
type SortOption = "newest" | "oldest" | "title";

const SOURCE_TABS: Array<{ id: SourceFilter; label: string }> = [
  { id: "all", label: "Recent" },
  { id: "scholarask", label: "ScholarAsk" },
  { id: "upload", label: "Upload" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function percentLabel(count: number, total: number): string {
  if (total === 0) return "0% of total";
  return `${Math.round((count / total) * 100)}% of total`;
}

function evidenceCellText(row: EvidenceLibraryRow): string {
  if (row.status === "pending") return "Analyzing…";
  if (row.status === "failed") return "Analysis unavailable";
  return row.evidence?.trim() || "—";
}

function exportEvidenceCsv(rows: EvidenceLibraryRow[]) {
  if (rows.length === 0) return;
  const csvRows = rows.map((row) => ({
    Title: row.title,
    Type: row.doc_type || "",
    Source: row.source === "scholarask" ? "ScholarAsk" : "Upload",
    Evidence: evidenceCellText(row),
    Caveat: row.status === "ready" ? row.caveat?.trim() || "" : "",
    Added: row.created_at,
  }));
  const csv = Papa.unparse(csvRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `evidence-library-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function EvidenceLibraryRowActions({
  onDelete,
  onRetry,
  retrying,
  row,
}: {
  onDelete: () => void;
  onRetry: () => void;
  retrying: boolean;
  row: EvidenceLibraryRow;
}) {
  return (
    <span className={styles.rowActions}>
      {row.status === "failed" && row.pdf_id ? (
        <button className={styles.retryButton} disabled={retrying} onClick={onRetry} type="button">
          {retrying ? "Retrying…" : "Retry"}
        </button>
      ) : null}
      <button aria-label={`Remove ${row.title} from your Evidence Library`} className={styles.deleteButton} onClick={onDelete} type="button">
        ×
      </button>
    </span>
  );
}

function EvidenceLibraryWorkspace({ mostRecentProjectId, userId }: { mostRecentProjectId: string | null; userId: string }) {
  const { rows, loading, removeRow, retryRow } = useEvidenceLibrary(userId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const total = rows.length;
  const scholarAskCount = useMemo(() => rows.filter((row) => row.source === "scholarask").length, [rows]);
  const uploadCount = useMemo(() => rows.filter((row) => row.source === "upload").length, [rows]);
  const caveatCount = useMemo(() => rows.filter((row) => row.caveat?.trim()).length, [rows]);

  const filteredRows = useMemo(() => {
    let next = filter === "all" ? rows : rows.filter((row) => row.source === filter);
    const query = search.trim().toLowerCase();
    if (query) {
      next = next.filter(
        (row) =>
          row.title.toLowerCase().includes(query) ||
          (row.evidence || "").toLowerCase().includes(query) ||
          (row.caveat || "").toLowerCase().includes(query)
      );
    }
    const sorted = [...next];
    if (sort === "newest") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "oldest") {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [rows, filter, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  async function handleRetry(row: EvidenceLibraryRow) {
    setRetryingId(row.id);
    await retryRow(row);
    setRetryingId(null);
  }

  const emptyMessage =
    filter === "all"
      ? "No evidence yet. Save a source from ScholarAsk or upload a PDF to see it here."
      : filter === "scholarask"
        ? "Nothing saved from ScholarAsk yet."
        : "No uploaded sources analyzed yet.";

  return (
    <div className={styles.libraryCanvas}>
      <header className={styles.libraryHeader}>
        <div>
          <p className={styles.headerEyebrow}>Research Desk</p>
          <h1>Evidence Library</h1>
          <p className={styles.headerSubtitle}>Review and manage evidence from ScholarAsk and your uploaded sources.</p>
        </div>
        {mostRecentProjectId ? (
          <Link className={styles.viewSynthesisButton} href={`/dashboard/project/${mostRecentProjectId}/literature-review`}>
            View synthesis →
          </Link>
        ) : null}
      </header>

      <p className={styles.infoNote}>
        <span aria-hidden="true">ⓘ</span>
        Recent shows both ScholarAsk and Upload items — distinguish them by the Source column.
      </p>

      <section className={styles.statRow}>
        <article className={styles.statTile}>
          <span>Total evidence items</span>
          <strong>{total}</strong>
          <small>All sources</small>
        </article>
        <article className={styles.statTile}>
          <span>ScholarAsk items</span>
          <strong>{scholarAskCount}</strong>
          <small>{percentLabel(scholarAskCount, total)}</small>
        </article>
        <article className={styles.statTile}>
          <span>Upload items</span>
          <strong>{uploadCount}</strong>
          <small>{percentLabel(uploadCount, total)}</small>
        </article>
        <article className={styles.statTile}>
          <span>Caveats flagged</span>
          <strong>{caveatCount}</strong>
          <small>{percentLabel(caveatCount, total)}</small>
        </article>
      </section>

      <section className={styles.controlsRow}>
        <input
          className={styles.searchInput}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search title, evidence, or caveat"
          type="search"
          value={search}
        />

        <nav aria-label="Evidence library views" className={styles.tabs}>
          {SOURCE_TABS.map((tab) => (
            <button
              className={filter === tab.id ? styles.activeTab : undefined}
              key={tab.id}
              onClick={() => {
                setFilter(tab.id);
                setPage(1);
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <label className={styles.sortControl}>
          Sort by
          <select
            onChange={(event) => {
              setSort(event.target.value as SortOption);
              setPage(1);
            }}
            value={sort}
          >
            <option value="newest">Added: Newest first</option>
            <option value="oldest">Added: Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>

        <button
          className={styles.exportButton}
          disabled={filteredRows.length === 0}
          onClick={() => exportEvidenceCsv(filteredRows)}
          type="button"
        >
          Export
        </button>
      </section>

      {!loading && filteredRows.length === 0 ? (
        <p className={styles.emptyBody}>{emptyMessage}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Source</th>
                <th>Evidence</th>
                <th>Caveat</th>
                <th>Added</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.titleCell}>{row.title}</td>
                  <td>{row.doc_type || "—"}</td>
                  <td>
                    <span className={row.source === "scholarask" ? styles.scholarSource : styles.uploadSource}>
                      {row.source === "scholarask" ? "ScholarAsk" : "Upload"}
                    </span>
                  </td>
                  <td className={row.status === "pending" ? styles.pendingCell : row.status === "failed" ? styles.failedCell : undefined}>
                    {evidenceCellText(row)}
                  </td>
                  <td>{row.status === "ready" ? row.caveat?.trim() || "—" : "—"}</td>
                  <td>{formatRelativeTime(row.created_at)}</td>
                  <td>
                    <EvidenceLibraryRowActions
                      onDelete={() => void removeRow(row.id)}
                      onRetry={() => void handleRetry(row)}
                      retrying={retryingId === row.id}
                      row={row}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredRows.length > 0 ? (
        <footer className={styles.libraryFooter}>
          <label className={styles.rowsPerPageControl}>
            Rows per page
            <select
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(1);
              }}
              value={rowsPerPage}
            >
              {ROWS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.pagination}>
            <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} type="button">
              Prev
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={pageNumber === currentPage ? styles.activePage : undefined}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} type="button">
              Next
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function EvidenceLibrarySignedOutState({ message, title }: { message: string; title: string }) {
  return (
    <div className={styles.libraryCanvas}>
      <header className={styles.libraryHeader}>
        <div>
          <p className={styles.headerEyebrow}>Research Desk</p>
          <h1>Evidence Library</h1>
          <p className={styles.headerSubtitle}>Review and manage evidence from ScholarAsk and your uploaded sources.</p>
        </div>
      </header>
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>{message}</p>
        <Link className={styles.emptyStateAction} href="/research-desk">
          Back to Research Desk
        </Link>
      </div>
    </div>
  );
}

export default function EvidenceLibraryPage() {
  const { user, loading: userLoading } = useUser();
  const { data, loading: dataLoading } = useResearchDeskData(user?.id);

  let body: ReactNode;

  if (userLoading || (dataLoading && data.projects.length === 0 && !!user)) {
    body = (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  } else if (!user) {
    body = (
      <EvidenceLibrarySignedOutState
        message="Sign in to review and manage your saved evidence."
        title="Sign in to see your Evidence Library"
      />
    );
  } else {
    body = <EvidenceLibraryWorkspace mostRecentProjectId={data.projects[0]?.id ?? null} userId={user.id} />;
  }

  return (
    <AppShell contentClassName={styles.evidenceLibraryMain}>
      <div className={styles.evidenceLibraryViewport} aria-label="Evidence Library">
        <div className={styles.evidenceLibraryStage}>{body}</div>
      </div>
    </AppShell>
  );
}
