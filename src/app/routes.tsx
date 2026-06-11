import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { AcceptInvitePage } from "@/app/pages/AcceptInvitePage";
import { LoginPage } from "@/app/pages/LoginPage";
import { PermissionTemplatesPage } from "@/app/pages/PermissionTemplatesPage";
import { AuditPage } from "@/app/pages/AuditPage";
import { NotificationsPage } from "@/app/pages/NotificationsPage";
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
import { BairrosSettingsPage } from "@/app/pages/BairrosSettingsPage";
import { TutorDetailPage } from "@/app/pages/TutorDetailPage";
import { TutorFormPage } from "@/app/pages/TutorFormPage";
import { TutorsListPage } from "@/app/pages/TutorsListPage";
import { OccurrenceDetailPage } from "@/app/pages/OccurrenceDetailPage";
import { OccurrenceFormPage } from "@/app/pages/OccurrenceFormPage";
import { OccurrenceRectifyPage } from "@/app/pages/OccurrenceRectifyPage";
import { OccurrenceTypesSettingsPage } from "@/app/pages/OccurrenceTypesSettingsPage";
import { AdoptionNewPage } from "@/app/pages/AdoptionNewPage";
import { ReturnNewPage } from "@/app/pages/ReturnNewPage";

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
      { path: "dogs/:dogId/occurrences/new", element: <OccurrenceFormPage /> },
      { path: "dogs/:dogId/occurrences/:occurrenceId", element: <OccurrenceDetailPage /> },
      {
        path: "dogs/:dogId/occurrences/:occurrenceId/rectify",
        element: <OccurrenceRectifyPage />,
      },
      { path: "tutors", element: <TutorsListPage /> },
      { path: "tutors/new", element: <TutorFormPage /> },
      { path: "tutors/:tutorId", element: <TutorDetailPage /> },
      { path: "tutors/:tutorId/edit", element: <TutorFormPage /> },
      { path: "adoptions/new", element: <AdoptionNewPage /> },
      { path: "returns/new", element: <ReturnNewPage /> },
      { path: "team", element: <TeamPage /> },
      { path: "team/invite", element: <TeamInvitePage /> },
      { path: "team/:userId", element: <TeamUserPage /> },
      { path: "settings", element: <SettingsPage /> },
      {
        path: "settings/permission-templates",
        element: <PermissionTemplatesPage />,
      },
      { path: "settings/occurrence-types", element: <OccurrenceTypesSettingsPage /> },
      { path: "settings/bairros", element: <BairrosSettingsPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "profile", element: <PlaceholderPage title="Perfil" /> },
    ],
  },
  { path: "*", element: <Navigate replace to="/" /> },
];

export const router = createBrowserRouter(appRoutes);
