import PageHeader from "@/components/app-ui/PageHeader";

export default function SettingsHeader() {
  return (
    <PageHeader
      className="settingsHeader mb-0 px-1 pb-3 pt-1 lg:items-center"
      title="Settings"
      subtitle="Manage your account identity, AI, privacy, and preferences."
    />
  );
}
