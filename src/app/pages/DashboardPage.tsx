import {
  ChevronRightIcon,
  DogIcon,
  PlusIcon,
  ScanLineIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { maskMicrochipInput } from "@/lib/masks";

function QuickLink({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: typeof DogIcon;
}) {
  return (
    <Link
      className="group flex items-center gap-3.5 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30"
      to={to}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export function DashboardPage() {
  const { can, user } = usePermissions();
  const navigate = useNavigate();
  const [microchip, setMicrochip] = useState("");

  const firstName = user?.nome?.split(" ")[0];

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const digits = microchip.replace(/\D/g, "");
    if (digits.length === 15) {
      void navigate(`/identify?microchip=${digits}`);
      return;
    }
    void navigate("/identify");
  };

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          {firstName ? `Olá, ${firstName}` : "Olá"}
        </h1>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">
          Por onde começamos hoje? Identifique um cão na rua ou navegue pelos
          cadastros da ONG.
        </p>
      </header>

      <div className="flex flex-col gap-5 rounded-2xl bg-sidebar p-5 text-sidebar-foreground sm:p-6">
        <Button
          asChild
          className="min-h-14 w-full bg-sidebar-primary text-base font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          size="lg"
        >
          <Link to="/identify">
            <ScanLineIcon aria-hidden="true" className="mr-2 size-5" />
            Identificar cão pela câmera
          </Link>
        </Button>

        <form onSubmit={handleSearch}>
          <Label className="mb-2 block text-sidebar-foreground" htmlFor="dashboard-microchip">
            Ou busque pelo número do microchip
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="min-h-12 border-transparent bg-background text-base tabular-nums text-foreground"
              id="dashboard-microchip"
              inputMode="numeric"
              onChange={(event) => setMicrochip(maskMicrochipInput(event.target.value))}
              placeholder="000 000 000 000 000"
              value={microchip}
            />
            <Button
              className="min-h-12 bg-sidebar-accent px-5 text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
              type="submit"
            >
              <SearchIcon aria-hidden="true" className="mr-2 size-4" />
              Buscar
            </Button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Atalhos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {can("dogs.read") ? (
            <QuickLink
              description="Lista completa com filtros e alertas"
              icon={DogIcon}
              title="Cães"
              to="/dogs"
            />
          ) : null}
          {can("dogs.create") ? (
            <QuickLink
              description="Microchip, fotos e dados iniciais"
              icon={PlusIcon}
              title="Cadastrar novo cão"
              to="/dogs/new"
            />
          ) : null}
          {can("tutors.read") ? (
            <QuickLink
              description="Cadastros, alertas e histórico"
              icon={UsersIcon}
              title="Tutores"
              to="/tutors"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
