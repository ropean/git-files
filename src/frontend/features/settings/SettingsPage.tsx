import { useAuth } from "~/features/auth/useAuth";
import { SyncKeysPanel } from "~/features/sync/SyncKeysPanel";
import { SyncRunsPanel } from "~/features/sync/SyncRunsPanel";
import s from "./SettingsPage.module.css";

export function SettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={s.loading}>Loading...</div>;
  }

  if (!user) {
    window.location.href = `/auth/login?return_to=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>Settings</h1>
      <SyncKeysPanel />
      <SyncRunsPanel />
    </div>
  );
}
