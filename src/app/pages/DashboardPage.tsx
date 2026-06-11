import { ScanLineIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { maskMicrochipInput } from "@/lib/masks";

export function DashboardPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [microchip, setMicrochip] = useState("");

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
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Busque por microchip, identifique caes e acesse os fluxos permitidos."
        title="Inicio"
      />

      <form className="rounded-xl border bg-card p-4" onSubmit={handleSearch}>
        <Label className="mb-2 block" htmlFor="dashboard-microchip">
          Busca rapida por microchip
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="dashboard-microchip"
            inputMode="numeric"
            onChange={(event) => setMicrochip(maskMicrochipInput(event.target.value))}
            placeholder="000 000 000 000 000"
            value={microchip}
          />
          <Button className="min-h-11" type="submit">
            <SearchIcon aria-hidden="true" className="mr-2 size-4" />
            Buscar
          </Button>
        </div>
      </form>

      <Button asChild className="min-h-14 w-full text-base" size="lg">
        <Link to="/identify">
          <ScanLineIcon aria-hidden="true" className="mr-2 size-5" />
          Identificar cao pela camera
        </Link>
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        {can("dogs.read") ? (
          <Button asChild className="min-h-11" variant="outline">
            <Link to="/dogs">Ver caes</Link>
          </Button>
        ) : null}
        {can("dogs.create") ? (
          <Button asChild className="min-h-11" variant="outline">
            <Link to="/dogs/new">Cadastrar novo cao</Link>
          </Button>
        ) : null}
        {can("tutors.read") ? (
          <Button asChild className="min-h-11" variant="outline">
            <Link to="/tutors">Ver tutores</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
