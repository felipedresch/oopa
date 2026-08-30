import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { AcceptInvitePage } from "@/app/pages/AcceptInvitePage";
import { LoginPage } from "@/app/pages/LoginPage";
import { PublicReportConfirmationPage } from "@/app/pages/PublicReportConfirmationPage";
import { PublicReportPage } from "@/app/pages/PublicReportPage";
import { PermissionTemplatesPage } from "@/app/pages/PermissionTemplatesPage";
import { AuditPage } from "@/app/pages/AuditPage";
import { NotificationsPage } from "@/app/pages/NotificationsPage";
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
import { PersonDetailPage } from "@/app/pages/PersonDetailPage";
import { PersonFormPage } from "@/app/pages/PersonFormPage";
import { PeopleListPage } from "@/app/pages/PeopleListPage";
import { OccurrenceDetailPage } from "@/app/pages/OccurrenceDetailPage";
import { OccurrenceFormPage } from "@/app/pages/OccurrenceFormPage";
import { OccurrenceRectifyPage } from "@/app/pages/OccurrenceRectifyPage";
import { OccurrenceTypesSettingsPage } from "@/app/pages/OccurrenceTypesSettingsPage";
import { OccurrencesListPage } from "@/app/pages/OccurrencesListPage";
import { AdoptionNewPage } from "@/app/pages/AdoptionNewPage";
import { ReturnNewPage } from "@/app/pages/ReturnNewPage";
import { ProfilePage } from "@/app/pages/ProfilePage";
import { RescueDetailPage } from "@/app/pages/RescueDetailPage";
import { RescueNewPage } from "@/app/pages/RescueNewPage";
import { RescuesListPage } from "@/app/pages/RescuesListPage";
import { CastrationDetailPage } from "@/app/pages/CastrationDetailPage";
import { CastrationNewPage } from "@/app/pages/CastrationNewPage";
import { CastrationsListPage } from "@/app/pages/CastrationsListPage";
import { OrganizationSettingsPage } from "@/app/pages/OrganizationSettingsPage";
import { ServicesCatalogPage } from "@/app/pages/ServicesCatalogPage";
import { SuppliesCatalogPage } from "@/app/pages/SuppliesCatalogPage";
import { AppointmentsListPage } from "@/app/pages/AppointmentsListPage";
import { AppointmentNewPage } from "@/app/pages/AppointmentNewPage";
import { AppointmentDetailPage } from "@/app/pages/AppointmentDetailPage";
import { AppointmentReceiptPage } from "@/app/pages/AppointmentReceiptPage";

export const appRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/reset-password", element: <RequestResetPage /> },
      { path: "/reset-password/:token", element: <ResetPasswordPage /> },
      { path: "/accept-invite/:token", element: <AcceptInvitePage /> },
      { path: "/denuncia", element: <PublicReportPage /> },
      { path: "/denuncia/:id/confirmacao", element: <PublicReportConfirmationPage /> },
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
      { path: "occurrences", element: <OccurrencesListPage /> },
      { path: "dogs/:dogId/occurrences/:occurrenceId", element: <OccurrenceDetailPage /> },
      {
        path: "dogs/:dogId/occurrences/:occurrenceId/rectify",
        element: <OccurrenceRectifyPage />,
      },
      { path: "people", element: <PeopleListPage /> },
      { path: "people/new", element: <PersonFormPage /> },
      { path: "people/:personId", element: <PersonDetailPage /> },
      { path: "people/:personId/edit", element: <PersonFormPage /> },
      { path: "adoptions/new", element: <AdoptionNewPage /> },
      { path: "returns/new", element: <ReturnNewPage /> },
      { path: "rescues", element: <RescuesListPage /> },
      { path: "rescues/new", element: <RescueNewPage /> },
      { path: "rescues/:id", element: <RescueDetailPage /> },
      { path: "castration", element: <CastrationsListPage /> },
      { path: "castration/new", element: <CastrationNewPage /> },
      { path: "castration/:id", element: <CastrationDetailPage /> },
      { path: "appointments", element: <AppointmentsListPage /> },
      { path: "appointments/new", element: <AppointmentNewPage /> },
      { path: "appointments/:id", element: <AppointmentDetailPage /> },
      { path: "appointments/:id/receipt", element: <AppointmentReceiptPage /> },
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
      { path: "settings/organization", element: <OrganizationSettingsPage /> },
      { path: "catalog/services", element: <ServicesCatalogPage /> },
      { path: "catalog/supplies", element: <SuppliesCatalogPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
  { path: "*", element: <Navigate replace to="/" /> },
];

export const router = createBrowserRouter(appRoutes);
