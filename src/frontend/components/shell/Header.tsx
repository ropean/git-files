import { Link } from "react-router";
import type { AuthUser } from "@shared/types/models";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { Icon, Logo } from "~/components/ui/Icon";
import { Tooltip } from "~/components/ui/Tooltip";

interface HeaderProps {
  user: AuthUser | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header
      style={{
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 16px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-base)",
        flexShrink: 0,
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          lineHeight: 1,
          flexShrink: 0,
          textDecoration: "none",
          color: "var(--text-primary)",
        }}
      >
        <Logo size={20} />
        <span className="mobile-hidden" style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.2px" }}>
          Git Files
        </span>
      </Link>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <ThemeToggle />
        {user ? (
          <>
            <Tooltip label="Settings">
              <Link to="/settings" className="btn btn-outline header-action">
                <Icon id="settings" size={14} />
                <span className="mobile-hidden">Settings</span>
              </Link>
            </Tooltip>
            <Tooltip label="Sign out">
              <a href="/auth/logout" className="btn btn-outline header-action">
                <Icon id="lock-open" size={14} />
                <span className="mobile-hidden">Sign out</span>
              </a>
            </Tooltip>
          </>
        ) : (
          <Tooltip label="Sign in">
            <Link to="/auth/login" className="btn btn-outline header-action">
              <Icon id="lock-solid" size={14} />
              <span className="mobile-hidden">Sign in</span>
            </Link>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
