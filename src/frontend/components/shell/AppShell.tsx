import type { AuthUser } from "@shared/types/models";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  user: AuthUser | null;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div
      className="app-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <Header user={user} />
      <main
        className="app-main"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "28px 24px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
