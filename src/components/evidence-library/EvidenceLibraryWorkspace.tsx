"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Papa from "papaparse";
import Spinner from "@/components/ui/Spinner";
import { useUser } from "@/hooks/useUser";
import { useEvidenceLibrary } from "@/hooks/useEvidenceLibrary";
import type { EvidenceLibraryRow } from "@/lib/research/evidenceLibrary";
import styles from "@/app/evidence-library/page.module.css";

type SortOption = "newest" | "oldest" | "title";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const elapsedDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (elapsedDays <= 0) return "Today";
  if (elapsedDays === 1) return "Yesterday";
  if (elapsedDays < 30) return `${elapsedDays} days ago`;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
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
    Citation: row.citation || "",
    Link: row.url || "",
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
  row,
}: {
  onDelete: () => void;
  row: EvidenceLibraryRow;
}) {
  return (
    <span className={styles.rowActions}>
      <button aria-label={`Remove ${row.title} from your Evidence Library`} className={styles.deleteButton} onClick={onDelete} type="button">
        ×
      </button>
    </span>
  );
}

function EvidenceLibraryWorkspace({ embedded = false, userId }: { embedded?: boolean; userId: string }) {
  const { rows, loading, removeRow } = useEvidenceLibrary(userId);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const total = rows.length;
  const mostRecentProjectId = rows.find((row) => row.project_id)?.project_id ?? null;
  const projectCount = useMemo(() => new Set(rows.map((row) => row.project_id).filter(Boolean)).size, [rows]);
  const linkedCount = useMemo(() => rows.filter((row) => row.url?.trim()).length, [rows]);
  const addedThisMonth = useMemo(() => {
    const now = new Date();
    return rows.filter((row) => {
      const added = new Date(row.created_at);
      return added.getFullYear() === now.getFullYear() && added.getMonth() === now.getMonth();
    }).length;
  }, [rows]);

  const filteredRows = useMemo(() => {
    let next = rows;
    const query = search.trim().toLowerCase();
    if (query) {
      next = next.filter(
        (row) =>
          row.title.toLowerCase().includes(query) ||
          (row.citation || "").toLowerCase().includes(query) ||
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
  }, [rows, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className={styles.libraryCanvas}>
      <header className={styles.libraryHeader}>
        <div>
          <p className={styles.headerEyebrow}>ScholarAsk</p>
          <h1>Evidence Library</h1>
          <p className={styles.headerSubtitle}>Review and manage the articles you save from ScholarAsk.</p>
        </div>
        {mostRecentProjectId && !embedded ? (
          <Link className={styles.viewSynthesisButton} href={`/dashboard/project/${mostRecentProjectId}/scholar-ask`}>
            Open ScholarAsk →
          </Link>
        ) : null}
      </header>

      <p className={styles.infoNote}>
        <span aria-hidden="true">ⓘ</span>
        Only articles you save from ScholarAsk appear in this library.
      </p>

      <section className={styles.statRow}>
        <article className={styles.statTile}>
          <span>Saved articles</span>
          <strong>{total}</strong>
          <small>From ScholarAsk</small>
        </article>
        <article className={styles.statTile}>
          <span>Projects represented</span>
          <strong>{projectCount}</strong>
          <small>Across your research</small>
        </article>
        <article className={styles.statTile}>
          <span>Articles with links</span>
          <strong>{linkedCount}</strong>
          <small>Ready to reopen</small>
        </article>
        <article className={styles.statTile}>
          <span>Added this month</span>
          <strong>{addedThisMonth}</strong>
          <small>ScholarAsk saves</small>
        </article>
      </section>

      <section className={styles.controlsRow}>
        <input
          className={styles.searchInput}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search saved articles"
          type="search"
          value={search}
        />

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
        <p className={styles.emptyBody}>No saved articles yet. Save an article from ScholarAsk to see it here.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Evidence</th>
                <th>Caveat</th>
                <th>Added</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.titleCell}>
                    {row.url ? (
                      <a className={styles.titleLink} href={row.url} rel="noopener noreferrer" target="_blank">
                        {row.title}
                      </a>
                    ) : (
                      row.title
                    )}
                  </td>
                  <td>{row.doc_type || "—"}</td>
                  <td className={row.status === "pending" ? styles.pendingCell : row.status === "failed" ? styles.failedCell : undefined}>
                    {evidenceCellText(row)}
                  </td>
                  <td>{row.status === "ready" ? row.caveat?.trim() || "—" : "—"}</td>
                  <td>{formatRelativeTime(row.created_at)}</td>
                  <td>
                    <EvidenceLibraryRowActions
                      onDelete={() => void removeRow(row.id)}
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
          <p className={styles.headerEyebrow}>ScholarAsk</p>
          <h1>Evidence Library</h1>
          <p className={styles.headerSubtitle}>Review and manage the articles you save from ScholarAsk.</p>
        </div>
      </header>
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>{message}</p>
        <Link className={styles.emptyStateAction} href="/projects">
          Back to Projects
        </Link>
      </div>
    </div>
  );
}

export function EvidenceLibraryEmbedded({ embedded = true }: { embedded?: boolean }) {
  const { user, loading: userLoading } = useUser();

  let body: ReactNode;

  if (userLoading) {
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
    body = <EvidenceLibraryWorkspace embedded={embedded} userId={user.id} />;
  }

  return <div className={embedded ? styles.embeddedLibrary : undefined}>{body}</div>;
}
