import { useEffect, useState } from "react";
import { Icon } from "~/components/ui/Icon";
import { Tooltip } from "~/components/ui/Tooltip";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as "dark" | "light";
    setTheme(current ?? "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    fetch("/api/theme", {
      method: "POST",
      body: new URLSearchParams({ theme: next }),
    });
  }

  return (
    <Tooltip label="Toggle theme">
      <button onClick={toggle} className="ibtn" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
        <Icon id={theme === "dark" ? "sun" : "moon"} size={15} />
      </button>
    </Tooltip>
  );
}
