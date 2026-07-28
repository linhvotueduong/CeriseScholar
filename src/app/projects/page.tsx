"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AppShell from "@/components/app-shell/AppShell";
import Spinner from "@/components/ui/Spinner";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/project";
import styles from "./page.module.css";

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return `Updated ${new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading || !user) return;

    let cancelled = false;
    const userId = user.id;
    async function loadProjects() {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (cancelled) return;
        if (queryError) {
          setError("Your projects could not be loaded. Please try again.");
          setProjects([]);
        } else {
          setProjects((data as Project[] | null) ?? []);
          setShowCreate((data?.length ?? 0) === 0);
        }
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError("Your projects could not be loaded. Please check your connection.");
        setProjects([]);
        setLoading(false);
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || !user || creating) return;

    setCreating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: cleanName,
          description: description.trim(),
          color: "#a87f4f",
        })
        .select("*")
        .single();

      if (insertError || !data) {
        setError(insertError?.message || "The project could not be created.");
        setCreating(false);
        return;
      }

      router.push(`/dashboard/project/${data.id}`);
    } catch {
      setError("The project could not be created. Please check your connection.");
      setCreating(false);
    }
  }

  const waiting = userLoading || (!!user && loading);

  return (
    <AppShell contentClassName={styles.projectsMain}>
      <main className={styles.projectsPage}>
        <header className={styles.hero}>
          <div>
            <h1>Projects</h1>
            <p>Create a project to organize your work across Cerise Scholar.</p>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.newButton} onClick={() => setShowCreate((current) => !current)} type="button">
              {showCreate ? "Cancel" : "+ New project"}
            </button>
          </div>
        </header>

        {showCreate ? (
          <form className={styles.createCard} onSubmit={createProject}>
            <div>
              <label htmlFor="project-name">Project name</label>
              <input
                autoFocus
                id="project-name"
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter a project name"
                required
                value={name}
              />
            </div>
            <div>
              <label htmlFor="project-description">Short note <span>(optional)</span></label>
              <textarea
                id="project-description"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a short description"
                rows={3}
                value={description}
              />
            </div>
            <button disabled={creating || !name.trim()} type="submit">
              {creating ? "Creating…" : "Create project →"}
            </button>
          </form>
        ) : null}

        {error ? <p className={styles.errorMessage}>{error}</p> : null}

        {waiting ? (
          <div className={styles.loadingState}>
            <Spinner size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>Create your first project</h2>
            <p>Your future Cerise Scholar work will stay organized inside the project you create.</p>
            {!showCreate ? (
              <button onClick={() => setShowCreate(true)} type="button">
                + New project
              </button>
            ) : null}
          </section>
        ) : (
          <section aria-label="Projects" className={styles.projectGrid}>
            {projects.map((project) => (
              <article className={styles.projectCard} key={project.id}>
                <div className={styles.projectCardTop}>
                  <span className={styles.projectMark} aria-hidden="true">P</span>
                  <span>{formatUpdatedAt(project.updated_at)}</span>
                </div>
                <h2>{project.name}</h2>
                <p>{project.description?.trim() || "A Cerise Scholar project."}</p>
                <div className={styles.projectActions}>
                  <Link className={styles.openButton} href={`/dashboard/project/${project.id}`}>
                    Open project →
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </AppShell>
  );
}
