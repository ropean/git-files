import { createBrowserRouter, Navigate } from "react-router";
import { AppShellLayout } from "./layouts/AppShellLayout";
import { SearchPage } from "~/features/search/SearchPage";
import { ReposPage } from "~/features/repos/ReposPage";
import { RepoFilesPage } from "~/features/repos/RepoFilesPage";
import { SettingsPage } from "~/features/settings/SettingsPage";
import { LoginRedirect } from "~/features/auth/LoginRedirect";

export const router = createBrowserRouter([
  {
    path: "/auth/login",
    element: <LoginRedirect />,
  },
  {
    element: <AppShellLayout />,
    children: [
      { index: true, element: <SearchPage /> },
      { path: "repos", element: <ReposPage /> },
      { path: "repos/*", element: <RepoFilesPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
