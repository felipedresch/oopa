import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { AcceptInvitePage } from "@/app/pages/AcceptInvitePage";
import { LoginPage } from "@/app/pages/LoginPage";
import { PermissionTemplatesPage } from "@/app/pages/PermissionTemplatesPage";
import { AdminPlaceholderPage } from "@/app/pages/AdminPlaceholderPage";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";
import { SettingsPage } from "@/app/pages/SettingsPage";
import { RequestResetPage } from "@/app/pages/RequestResetPage";
import { ResetPasswordPage } from "@/app/pages/ResetPasswordPage";
import { TeamInvitePage } from "@/app/pages/TeamInvitePage";
import { TeamPage } from "@/app/pages/TeamPage";
import { TeamUserPage } from "@/app/pages/TeamUserPage";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { DogDetailPage } from "@/app/pages/DogDetailPage";
import { DogFormPage } from "@/app/pages/DogFormPage";
import { DogsListPage } from "@/app/pages/DogsListPage";
import { IdentifyPage } from "@/app/pages/IdentifyPage";

export const appRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/reset-password", element: <RequestResetPage /> },
      { path: "/reset-password/:token", element: <ResetPasswordPage /> },
      { path: "/accept-invite/:token", element: <AcceptInvitePage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "identify", element: <IdentifyPage /> },
      { path: "dogs", element: <DogsListPage /> },
      { path: "dogs/new", element: <DogFormPage /> },
      { path: "dogs/:dogId", element: <DogDetailPage /> },
      { path: "dogs/:dogId/edit", element: <DogFormPage /> },
      {
        path: "dogs/:dogId/occurrences/new",
        element: <PlaceholderPage title="Nova ocorrencia" />,
      },
      { path: "tutors", element: <PlaceholderPage title="Tutores" /> },
      { path: "tutors/new", element: <PlaceholderPage title="Novo tutor" /> },
      { path: "tutors/:tutorId", element: <PlaceholderPage title="Ficha do tutor" /> },
      { path: "tutors/:tutorId/edit", element: <PlaceholderPage title="Editar tutor" /> },
      { path: "adoptions/new", element: <PlaceholderPage title="Nova adocao" /> },
      { path: "returns/new", element: <PlaceholderPage title="Nova devolucao" /> },
      { path: "team", element: <TeamPage /> },
      { path: "team/invite", element: <TeamInvitePage /> },
      { path: "team/:userId", element: <TeamUserPage /> },
      { path: "settings", element: <SettingsPage /> },
      {
        path: "settings/permission-templates",
        element: <PermissionTemplatesPage />,
      },
      {
        path: "settings/occurrence-types",
        element: (
          <AdminPlaceholderPage
            permission="occurrence_types.manage"
            title="Tipos de ocorrencia"
          />
        ),
      },
      {
        path: "settings/bairros",
        element: <AdminPlaceholderPage permission="bairros.manage" title="Bairros" />,
      },
      {
        path: "audit",
        element: <AdminPlaceholderPage permission="system.audit_log" title="Auditoria" />,
      },
      { path: "notifications", element: <PlaceholderPage title="Notificacoes" /> },
      { path: "profile", element: <PlaceholderPage title="Perfil" /> },
    ],
  },
  { path: "*", element: <Navigate replace to="/" /> },
];

export const router = createBrowserRouter(appRoutes);
