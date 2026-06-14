"use client";

import { AppIcon } from "@/components/app-shell/AppIcons";
import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { useLocalAgentStatus } from "@/hooks/useLocalAgentStatus";

const readinessChecks = [
  "Local agent is running",
  "Ollama is available",
  "Research folder is connected",
  "Knowledge base is available",
  "File index is up to date",
  "Safety check is configured",
];

export default function LocalSetupSettingsPage() {
  const localAgent = useLocalAgentStatus();
  const agentReady = localAgent.hostedAiBypass || localAgent.ui.status === "connected";

  return (
    <SettingsPanel
      className="h-[800px] min-h-[800px] max-h-[800px] pb-10"
      title="Local Setup"
      description="Your laptop signal and local agent status."
    >
      <section className="mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[10px] border border-[#e5e1dc] bg-white md:grid-cols-3">
        <StatusMetric icon="dashboard" label="Overall status" value={agentReady ? "Ready" : "Needs setup"} />
        <StatusMetric icon="target" label="Local readiness" value={localAgent.hostedAiBypass ? "Bypassed" : "92%"} />
        <StatusMetric icon="check-square" label="Checks ready" value="4/4" />
      </section>

      <section className="mt-3 grid gap-x-12 gap-y-2 rounded-[10px] border border-[#e5e1dc] bg-white px-5 py-3 md:grid-cols-2">
        {readinessChecks.map((check) => (
          <div className="flex items-center gap-2.5 text-[11px] font-bold text-[#17120d]" key={check}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#17120d]">
              <AppIcon className="h-3 w-3" name="check-square" />
            </span>
            {check}
          </div>
        ))}
      </section>

      <SettingsBlock
        title="Research Folder"
        body="Your research files are stored locally on your device."
      >
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_128px_128px]">
          <div className="truncate rounded-[8px] border border-[#e5e1dc] px-3 py-2.5 text-[11px] font-semibold text-[#17120d]">
            /Users/jane/Documents/Cerise Scholar/Research
          </div>
          <button className="rounded-[8px] border border-[#d8d3ce] px-3 py-2.5 text-[11px] font-bold" type="button">
            Change Folder
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#d8d3ce] px-3 py-2.5 text-[11px] font-bold" type="button">
            <AppIcon className="h-4 w-4" name="folder" />
            Open Folder
          </button>
        </div>
      </SettingsBlock>

      <SettingsBlock
        title="Permissions & Privacy"
        body="Your data stays private and under your control."
      >
        <div className="grid gap-0 overflow-hidden rounded-[10px] border border-[#eeeae5] md:grid-cols-3">
          <PrivacyItem icon="lock" title="Files stay local by default." body="They are never uploaded or shared without your consent." />
          <PrivacyItem icon="folder" title="You control folder access." body="Choose, change, or remove your research folder anytime." />
          <PrivacyItem icon="shield" title="Local AI access is checked before source-file work starts." body="Ensures safe and private research operations." />
        </div>
      </SettingsBlock>

      <SettingsBlock title="Local Services" body="Overview of key local services and their connection status.">
        <div className="overflow-hidden rounded-[10px] border border-[#eeeae5]">
          {[
            ["Local Agent", localAgent.hostedAiBypass ? "Hosted" : agentReady ? "Connected" : "Check"],
            ["Ollama", localAgent.hostedAiBypass ? "Bypassed" : "Ready"],
            ["Research Folder", "User Controlled"],
            ["Safety", "Checked"],
          ].map(([label, state]) => (
            <div className="grid grid-cols-[1fr_auto_10px] items-center gap-3 border-t border-[#eeeae5] px-3 py-1.5 text-[11px] first:border-t-0" key={label}>
              <span className="font-bold text-[#17120d]">{label}</span>
              <span className="text-xs font-bold text-[#4f4842]">{state}</span>
              <span className="h-2 w-2 rounded-full bg-[#16803c]" />
            </div>
          ))}
        </div>
      </SettingsBlock>

      <SettingsBlock title="Actions" body="Run checks, reconnect services, or pause local access.">
        <div className="grid gap-2 md:grid-cols-3">
          <button className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#111111] px-3 py-3 text-[11px] font-bold text-white" onClick={() => void localAgent.checkNow()} type="button">
            <AppIcon className="h-4 w-4" name="play" />
            Run Check
          </button>
          <button className="rounded-[8px] border border-[#d8d3ce] px-3 py-3 text-[11px] font-bold" type="button">
            Reconnect
          </button>
          <button className="rounded-[8px] border border-[#d8d3ce] px-3 py-3 text-[11px] font-bold" type="button">
            Pause Local Access
          </button>
        </div>
      </SettingsBlock>
    </SettingsPanel>
  );
}

function StatusMetric({
  icon,
  label,
  value,
}: {
  icon: "dashboard" | "target" | "check-square";
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[58px] items-center justify-center gap-4 border-b border-r border-[#eeeae5] p-3 last:border-r-0 md:border-b-0">
      <AppIcon className="h-6 w-6 text-[#17120d]" name={icon} />
      <div>
        <p className="text-[10px] font-semibold text-[#6f6760]">{label}</p>
        <p className="mt-0.5 text-[14px] font-bold leading-none text-[#17120d]">{value}</p>
      </div>
    </div>
  );
}

function SettingsBlock({
  body,
  children,
  title,
}: {
  body: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-3 grid gap-3 rounded-[10px] border border-[#e5e1dc] bg-white p-4 lg:grid-cols-[230px_minmax(0,1fr)]">
      <div>
        <h3 className="text-[12px] font-bold text-[#17120d]">{title}</h3>
        <p className="mt-0.5 text-[10px] leading-3.5 text-[#6f6760]">{body}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function PrivacyItem({
  body,
  icon,
  title,
}: {
  body: string;
  icon: "lock" | "folder" | "shield";
  title: string;
}) {
  return (
    <div className="grid gap-2 border-b border-r border-[#eeeae5] p-4 last:border-r-0 md:border-b-0">
      <AppIcon className="h-6 w-6 text-[#17120d]" name={icon} />
      <p className="text-[11px] font-bold leading-3.5 text-[#17120d]">{title}</p>
      <p className="text-[10px] leading-3.5 text-[#6f6760]">{body}</p>
    </div>
  );
}
