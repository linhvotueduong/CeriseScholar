import SettingsPanel from "@/components/app-ui/SettingsPanel";
import { AppIcon } from "@/components/app-shell/AppIcons";

export default function NotificationsSettingsPage() {
  return (
    <SettingsPanel
      title="Notifications"
      description="Manage how and when you receive updates from Cerise Scholar."
    >
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[12px] border border-[#e5e1dc] bg-[#faf7f0] px-6 py-16 text-center">
        <AppIcon className="h-8 w-8 text-[#17120d]" name="bell" />
        <h3 className="text-[15px] font-bold text-[#17120d]">Notification settings are coming soon</h3>
        <p className="max-w-[420px] text-[12px] leading-5 text-[#6f6760]">
          Cerise Scholar doesn&apos;t yet send email or push notifications, so there&apos;s
          nothing to configure yet. This page will let you control alerts, digests, and reminders
          once notifications are built.
        </p>
      </div>
    </SettingsPanel>
  );
}
