import app from "../src/backend/app";

export const onRequest: PagesFunction = (context) => app.fetch(context.request, context.env, context as unknown as ExecutionContext);
