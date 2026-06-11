import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-svh bg-background">
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
