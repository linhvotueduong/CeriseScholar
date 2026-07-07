import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { AppIcon } from "@/components/app-shell/AppIcons";

export default function PreferencesSettingsPage() {
  return (
    <SettingsPanel
      title="Preferences"
      description="Customize your workspace, research defaults, and reading experience."
    >
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[12px] border border-[#e5e1dc] bg-[#faf7f0] px-6 py-16 text-center">
        <AppIcon className="h-8 w-8 text-[#17120d]" name="settings" />
        <h3 className="text-[15px] font-bold text-[#17120d]">Preferences are coming soon</h3>
        <p className="max-w-[420px] text-[12px] leading-5 text-[#6f6760]">
          Cerise Scholar doesn&apos;t yet save personal workspace, citation, or reading
          preferences. When this ships, you&apos;ll be able to set your defaults right here.
        </p>
      </div>
    </SettingsPanel>
  );
}
