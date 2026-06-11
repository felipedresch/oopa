import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  useConvexAuth: () => ({
    isLoading: false,
    isAuthenticated: false,
  }),
}));

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal();
  return Object.assign({}, actual, {
    useQuery: () => undefined,
    useMutation: () => vi.fn(),
  });
});
