import { useState } from "react";
import { useAuth } from "~/features/auth/useAuth";
import { SyncKeysPanel } from "~/features/sync/SyncKeysPanel";
import { SyncRunsPanel } from "~/features/sync/SyncRunsPanel";
import { Icon } from "~/components/ui/Icon";
import s from "./SettingsPage.module.css";

const TABS = [
  { id: "keys", label: "Sync keys", icon: "lock" },
  { id: "runs", label: "Sync run history", icon: "clock" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabId>("keys");

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
      <div className={s.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`${s.tab} ${tab === t.id ? s.tabActive : ""}`} onClick={() => setTab(t.id)}>
            <Icon id={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "keys" && <SyncKeysPanel />}
      {tab === "runs" && <SyncRunsPanel />}
    </div>
  );
}
