import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL. Run `npx convex dev` first.");
}

const convex = new ConvexReactClient(convexUrl);

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
