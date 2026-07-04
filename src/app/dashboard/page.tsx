"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import DashboardExactTemplate from "@/components/dashboard/DashboardExactTemplate";
import Spinner from "@/components/ui/Spinner";
import { logDashboardActivity } from "@/lib/dashboard/activity";
import type { DashboardSectionId } from "@/lib/dashboard/deriveDashboardState";
import { dashboardSections } from "@/lib/app-data/dashboard";
import { useDashboardState } from "@/hooks/useDashboardState";
import { useLocalAgentStatus } from "@/hooks/useLocalAgentStatus";
import { useUser } from "@/hooks/useUser";
import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/project";

const fallbackProjects: Project[] = [
  {
    id: "environmental-uncertainty",
    user_id: "fixture",
    name: "Environmental Uncertainty & Career Procrastination",
    description: "Literature sprint for evidence rows, synthesis notes, and draft planning.",
    color: "#a87f4f",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [visibleSections, setVisibleSections] = useState(
    () => new Set(dashboardSections.filter((section) => section.id !== "notes").map((section) => section.id))
  );
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const loggedProjectOpenRef = useRef("");
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  // Greeting name from the profile/display-name helper; never expose the raw email.
  const { displayName } = useProfile("");
  const greetingName = displayName && displayName !== user?.email ? displayName.split(/\s+/)[0] : "";
  const localAgent = useLocalAgentStatus();
  const projectOptions = projects.length ? projects : fallbackProjects;
  const activeProject = projectOptions.find((project) => project.id === activeProjectId) || projectOptions[0];
  const agentReady = localAgent.hostedAiBypass || localAgent.ui.status === "connected";
  const ollamaReady =
    localAgent.hostedAiBypass || Boolean(localAgent.health?.ollama?.ok ?? localAgent.health?.ollama?.connected);
  const safetyReady = localAgent.health?.ollama?.security?.ok !== false;
  const dashboardState = useDashboardState({
    project: activeProject,
    userId: user?.id,
    agentReady,
    ollamaReady,
    safetyReady,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      const supabase = createClient();
      const timeout = new Promise<{ data: Project[] | null }>((resolve) => {
        window.setTimeout(() => resolve({ data: null }), 2500);
      });
      const { data } = await Promise.race([
        supabase.from("projects").select("*").order("updated_at", { ascending: false }),
        timeout,
      ]).catch(() => ({ data: null }));

      if (cancelled) return;

      const nextProjects = (data as Project[] | null) || [];
      setProjects(nextProjects);
      setActiveProjectId((current) => current || nextProjects[0]?.id || fallbackProjects[0].id);
      setLoading(false);
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim() || !user) return;

    setCreating(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: newName.trim(),
        description: newDesc.trim(),
        color: "#a87f4f",
      })
      .select()
      .single();

    if (data) {
      router.push(`/dashboard/project/${data.id}`);
      return;
    }

    setCreating(false);
  }

  function toggleSection(sectionId: string) {
    setVisibleSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  useEffect(() => {
    if (!user || activeProject.user_id === "fixture") return;
    const key = `${user.id}:${activeProject.id}`;
    if (loggedProjectOpenRef.current === key) return;
    loggedProjectOpenRef.current = key;
    void logDashboardActivity({
      projectId: activeProject.id,
      eventType: "project_opened",
      sectionId: dashboardState.data.activeSectionId,
      label: "Opened project dashboard",
    });
  }, [activeProject.id, activeProject.user_id, dashboardState.data.activeSectionId, user]);

  function handleOpenResearchSection(sectionId: DashboardSectionId) {
    const routes: Record<DashboardSectionId, string> = {
      "meta-analysis": `/dashboard/project/${activeProject.id}/meta-analysis`,
      "literature-review": `/dashboard/project/${activeProject.id}/literature-review`,
      workspace: `/dashboard/project/${activeProject.id}`,
      upload: `/dashboard/upload?project=${activeProject.id}`,
      scholarask: `/dashboard/project/${activeProject.id}/scholar-ask`,
      draft: `/dashboard/project/${activeProject.id}/paper-writer`,
      citations: `/dashboard/project/${activeProject.id}/literature-review`,
      notes: "/research-guidance",
    };
    void logDashboardActivity({
      projectId: activeProject.id,
      eventType: "research_focus_opened",
      sectionId,
      label: `Opened ${sectionId}`,
    });
    router.push(routes[sectionId]);
  }

  // Wait for projects, auth, AND the dashboard data to settle on the real project before
  // rendering — otherwise the fixture/pre-auth demo state briefly flashes as if real.
  // (Stale = data is for a different project/user; focus refetches are not stale.)
  if (loading || userLoading || dashboardState.stale) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardExactTemplate
      activeProject={activeProject}
      agentReady={agentReady}
      creating={creating}
      dashboardData={dashboardState.data}
      dashboardError={dashboardState.error}
      dashboardLoading={dashboardState.loading}
      localAgentChecking={localAgent.checking}
      newDesc={newDesc}
      newName={newName}
      ollamaReady={ollamaReady}
      onAddScheduleTask={dashboardState.addTask}
      onCompleteTask={dashboardState.completeTask}
      onCreateProject={handleCreate}
      onNewDescChange={setNewDesc}
      onNewNameChange={setNewName}
      onOpenResearchSection={handleOpenResearchSection}
      onSectionFeedback={dashboardState.submitSectionFeedback}
      usingDemo={dashboardState.usingDemo}
      demoCards={dashboardState.demoCards}
      userName={greetingName}
      onProjectChange={setActiveProjectId}
      onSaveTargetSettings={dashboardState.saveTargetSettings}
      onToggleCreate={() => setShowCreate((current) => !current)}
      onToggleSection={toggleSection}
      projectOptions={projectOptions}
      safetyReady={safetyReady}
      showCreate={showCreate}
      targetSettings={dashboardState.targetSettings}
      visibleSections={visibleSections}
    />
  );
}
