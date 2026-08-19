import { useEffect } from "react";
import s from "./LoginRedirect.module.css";

export function LoginRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("redirect");
    const redirect = !raw ? "/" : raw;
    window.location.href = `/auth/login?return_to=${encodeURIComponent(redirect)}`;
  }, []);

  return <div className={s.loading}>Redirecting to login...</div>;
}
