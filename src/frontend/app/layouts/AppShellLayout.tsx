import { Outlet } from "react-router";
import { useAuth } from "~/features/auth/useAuth";
import { AppShell } from "~/components/shell/AppShell";

export function AppShellLayout() {
  const { user } = useAuth();

  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
