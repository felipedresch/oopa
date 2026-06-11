import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";

export const appRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <PlaceholderPage title="Login" /> },
      { path: "/reset-password", element: <PlaceholderPage title="Solicitar reset de senha" /> },
      {
        path: "/reset-password/:token",
        element: <PlaceholderPage title="Criar nova senha" />,
      },
      {
        path: "/accept-invite/:token",
        element: <PlaceholderPage title="Aceitar convite" />,
      },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <PlaceholderPage title="Dashboard" /> },
      { path: "identify", element: <PlaceholderPage title="Identificar cao" /> },
      { path: "dogs", element: <PlaceholderPage title="Caes" /> },
      { path: "dogs/new", element: <PlaceholderPage title="Novo cao" /> },
      { path: "dogs/:dogId", element: <PlaceholderPage title="Ficha do cao" /> },
      { path: "dogs/:dogId/edit", element: <PlaceholderPage title="Editar cao" /> },
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
      { path: "team", element: <PlaceholderPage title="Equipe" /> },
      { path: "team/invite", element: <PlaceholderPage title="Convidar usuario" /> },
      { path: "team/:userId", element: <PlaceholderPage title="Usuario da equipe" /> },
      { path: "settings", element: <PlaceholderPage title="Configuracoes" /> },
      {
        path: "settings/permission-templates",
        element: <PlaceholderPage title="Templates de permissao" />,
      },
      {
        path: "settings/occurrence-types",
        element: <PlaceholderPage title="Tipos de ocorrencia" />,
      },
      { path: "settings/bairros", element: <PlaceholderPage title="Bairros" /> },
      { path: "audit", element: <PlaceholderPage title="Auditoria" /> },
      { path: "notifications", element: <PlaceholderPage title="Notificacoes" /> },
      { path: "profile", element: <PlaceholderPage title="Perfil" /> },
    ],
  },
  { path: "*", element: <Navigate replace to="/" /> },
];

export const router = createBrowserRouter(appRoutes);
