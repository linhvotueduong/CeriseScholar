import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { SettingsRow, ToggleSwitch } from "@/components/app-ui/SettingsControls";
import { AppIcon } from "@/components/app-shell/AppIcons";

export default function PreferencesSettingsPage() {
  return (
    <SettingsPanel
      className="h-[800px] min-h-[800px] max-h-[800px] pb-10"
      title="Preferences"
      description="Customize your workspace, research defaults, and reading experience."
    >
      <div className="flex h-[674px] flex-col">
        <section className="grid gap-3 md:grid-cols-4">
          <SummaryCard icon="folder" label="Start page" value="Research Desk" />
          <SummaryCard icon="book-open" label="Citation style" value="APA 7" />
          <SummaryCard icon="settings" label="Theme" value="Light" />
          <SummaryCard icon="list" label="Density" value="Comfortable" />
        </section>

        <section className="mt-4 grid flex-1 gap-3 lg:grid-cols-2">
          <MiniPanel title="A. Workspace Preferences">
            <PrefRow label="Default start page" action={<Select value="Research Desk" />} />
            <PrefRow label="Open last project on launch" action={<ToggleSwitch defaultOn />} />
            <PrefRow label="Default section when returning to a project" action={<Select value="Last opened section" />} />
            <PrefRow label="Workspace density" action={<Select value="Comfortable" />} />
            <PrefRow label="Autosave notes and drafts" action={<ToggleSwitch defaultOn />} />
          </MiniPanel>
          <MiniPanel title="B. Research Defaults">
            <PrefRow label="Citation style" body="Default citation format for research outputs." action={<Select value="APA 7" />} />
            <PrefRow label="Literature review table sort" action={<Select value="Recently updated" />} />
            <PrefRow label="Reference export format" action={<Select value="RIS" />} />
            <PrefRow label="Show evidence counts on project cards" action={<ToggleSwitch defaultOn />} />
          </MiniPanel>
          <MiniPanel title="C. Course Library Preferences">
            <PrefRow label="Resume latest lesson automatically" action={<ToggleSwitch defaultOn />} />
            <PrefRow label="Show recommended courses" action={<ToggleSwitch defaultOn />} />
            <PrefRow label="Display course progress on dashboard" action={<ToggleSwitch defaultOn />} />
            <PrefRow label="Preferred lesson layout" action={<Select value="Split view" />} />
          </MiniPanel>
          <MiniPanel title="D. Appearance & Reading">
            <PrefRow label="Theme" action={<Select value="Light" />} />
            <PrefRow label="Reading text size" action={<Segmented options={["Small", "Medium", "Large"]} active="Medium" />} />
            <PrefRow label="Reduce motion" action={<ToggleSwitch />} />
            <PrefRow label="Compact sidebar labels" action={<ToggleSwitch />} />
          </MiniPanel>
        </section>

        <footer className="mt-4 flex items-center justify-between border-t border-[#eeeae5] pt-4">
          <button className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d8d3ce] px-5 text-[12px] font-bold text-[#17120d]" type="button">
            <AppIcon className="h-[18px] w-[18px]" name="refresh" />
            Reset to defaults
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#111111] px-6 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(17,17,17,0.12)]" type="button">
            Save Settings
          </button>
        </footer>
      </div>
    </SettingsPanel>
  );
}

function PrefRow({ action, body, label }: { action?: React.ReactNode; body?: string; label: string }) {
  return <SettingsRow action={action} body={body} className="min-h-[44px] py-2.5" label={label} />;
}

function SummaryCard({ icon, label, value }: { icon: "folder" | "book-open" | "settings" | "list"; label: string; value: string }) {
  return (
    <article className="flex min-h-[70px] items-center gap-4 rounded-[10px] border border-[#e5e1dc] bg-white px-5 py-3">
      <AppIcon className="h-7 w-7 text-[#17120d]" name={icon} />
      <div>
        <p className="text-[11px] font-semibold text-[#6f6760]">{label}</p>
        <p className="mt-0.5 text-[15px] font-bold leading-none text-[#17120d]">{value}</p>
      </div>
    </article>
  );
}

function MiniPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="flex min-h-[236px] flex-col rounded-[12px] border border-[#e5e1dc] p-4">
      <h3 className="text-[13px] font-bold text-[#111111]">{title}</h3>
      <div className="mt-3 flex-1">{children}</div>
    </article>
  );
}

function Select({ value }: { value: string }) {
  return (
    <button className="inline-flex h-9 min-w-[146px] items-center justify-between rounded-[8px] border border-[#d8d3ce] px-3 text-left text-[11px] font-bold text-[#17120d]" type="button">
      {value}
      <AppIcon className="h-3.5 w-3.5 text-[#7b7168]" name="chevron-down" />
    </button>
  );
}

function Segmented({ options, active }: { options: string[]; active: string }) {
  return (
    <div className="grid h-9 grid-cols-3 rounded-[8px] border border-[#e5e1dc] bg-white p-0.5 text-[11px] font-bold text-[#6f6760]">
      {options.map((option) => (
        <span className={option === active ? "rounded-[6px] bg-[#111111] px-3 py-2 text-white" : "px-3 py-2"} key={option}>
          {option}
        </span>
      ))}
    </div>
  );
}
