import { Hono } from "hono";
import type { Env } from "@shared/types/env";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.post("/", async (c) => {
  const data = await c.req.formData();
  const theme = data.get("theme") === "light" ? "light" : "dark";
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": `theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`,
    },
  });
});

export default app;
