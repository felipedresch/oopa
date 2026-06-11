import { DogIcon } from "lucide-react";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-svh bg-background">
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <DogIcon aria-hidden="true" className="size-7" />
          </span>
          <div className="leading-tight">
            <p className="font-heading text-2xl font-bold tracking-tight">oopa</p>
            <p className="text-sm text-muted-foreground">Protecao animal, bem cuidada</p>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
