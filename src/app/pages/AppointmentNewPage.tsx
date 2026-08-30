import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { NotaFiscalUpload } from "@/components/NotaFiscalUpload";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { APPOINTMENT_TYPE_LABELS, type AppointmentType } from "@/lib/domain-colors";
import { formatCurrency } from "@/lib/formatters";

const APPOINTMENT_TYPES = Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[];

type ServiceCatalogItem = {
  _id: Id<"services">;
  nome: string;
  valor_padrao: number;
};

type SupplyCatalogItem = {
  _id: Id<"supplies">;
  nome: string;
  unidade_medida?: string;
  valor_padrao: number;
};

type ServiceLine = {
  serviceId: Id<"services">;
  quantidade: string;
  valorUnitario: string;
};

type SupplyLine = {
  supplyId: Id<"supplies">;
  quantidade: string;
  valorUnitario: string;
};

function localDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function localDateValue(timestamp: number | null): string {
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

function parseNumber(value: string): number {
  return Number(value.replace(",", "."));
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function AppointmentNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const createAppointment = useMutation(api.appointments.create);
  const [now] = useState(() => Date.now());

  const [dogSearch, setDogSearch] = useState("");
  const [dogId, setDogId] = useState<Id<"dogs"> | undefined>();
  const [dogName, setDogName] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [solicitanteId, setSolicitanteId] = useState<Id<"people"> | undefined>();
  const [personName, setPersonName] = useState("");
  const [veterinarioUserId, setVeterinarioUserId] = useState<Id<"users"> | "">("");
  const [tipoAtendimento, setTipoAtendimento] = useState<AppointmentType>("consulta");
  const [dataAtendimento, setDataAtendimento] = useState(localDateTimeValue());
  const [historico, setHistorico] = useState("");
  const [servicos, setServicos] = useState<ServiceLine[]>([]);
  const [insumos, setInsumos] = useState<SupplyLine[]>([]);
  const [desconto, setDesconto] = useState("");
  const [notaFiscalStorageId, setNotaFiscalStorageId] = useState<Id<"_storage"> | undefined>();
  const [notaFiscalFileName, setNotaFiscalFileName] = useState<string>();
  const [notaFiscalNumero, setNotaFiscalNumero] = useState("");
  const [notaFiscalValor, setNotaFiscalValor] = useState("");
  const [dataEmissaoNotaFiscal, setDataEmissaoNotaFiscal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dogResults = usePaginatedQuery(
    api.dogs.list,
    can("appointments.create") && dogSearch && !dogId ? { search: dogSearch, now } : "skip",
    { initialNumItems: 8 },
  );
  const personResults = usePaginatedQuery(
    api.people.list,
    can("appointments.create") && personSearch && !solicitanteId
      ? { search: personSearch }
      : "skip",
    { initialNumItems: 8 },
  );
  const veterinarians = useQuery(
    api.appointments.listVeterinarians,
    can("appointments.create") ? {} : "skip",
  );
  const serviceCatalog = useQuery(
    api.services.listActiveForAppointments,
    can("appointments.create") ? {} : "skip",
  ) as ServiceCatalogItem[] | undefined;
  const supplyCatalog = useQuery(
    api.supplies.listActiveForAppointments,
    can("appointments.create") ? {} : "skip",
  ) as SupplyCatalogItem[] | undefined;

  const total = useMemo(() => {
    const servicesTotal = servicos.reduce(
      (sum, line) => sum + Math.max(0, parseNumber(line.quantidade)) * Math.max(0, parseNumber(line.valorUnitario)),
      0,
    );
    const suppliesTotal = insumos.reduce(
      (sum, line) => sum + Math.max(0, parseNumber(line.quantidade)) * Math.max(0, parseNumber(line.valorUnitario)),
      0,
    );
    return Math.max(0, servicesTotal + suppliesTotal - Math.max(0, parseNumber(desconto) || 0));
  }, [desconto, insumos, servicos]);

  if (!can("appointments.create")) {
    return <PermissionDenied />;
  }

  const addService = (service: ServiceCatalogItem) => {
    if (servicos.some((line) => line.serviceId === service._id)) {
      setError("Esse serviço já foi adicionado ao atendimento.");
      return;
    }
    setError(null);
    setServicos((current) => [
      ...current,
      { serviceId: service._id, quantidade: "1", valorUnitario: String(service.valor_padrao) },
    ]);
  };

  const addSupply = (supply: SupplyCatalogItem) => {
    if (insumos.some((line) => line.supplyId === supply._id)) {
      setError("Esse insumo já foi adicionado ao atendimento.");
      return;
    }
    setError(null);
    setInsumos((current) => [
      ...current,
      { supplyId: supply._id, quantidade: "1", valorUnitario: String(supply.valor_padrao) },
    ]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!dogId) {
      setError("Selecione o animal atendido.");
      return;
    }
    if (!veterinarioUserId) {
      setError("Selecione o veterinário responsável.");
      return;
    }
    if (!historico.trim()) {
      setError("Informe o histórico do atendimento.");
      return;
    }
    const parsedDate = new Date(dataAtendimento).getTime();
    if (!Number.isFinite(parsedDate)) {
      setError("Informe uma data de atendimento válida.");
      return;
    }
    const parsedDiscount = desconto ? parseNumber(desconto) : undefined;
    if (parsedDiscount !== undefined && (!Number.isFinite(parsedDiscount) || parsedDiscount < 0)) {
      setError("Informe um desconto válido.");
      return;
    }
    const invalidLine = [...servicos, ...insumos].some(
      (line) => parseNumber(line.quantidade) <= 0 || parseNumber(line.valorUnitario) < 0,
    );
    if (invalidLine) {
      setError("Revise as quantidades e os valores lançados.");
      return;
    }
    const parsedNotaFiscalValor = notaFiscalValor ? parseNumber(notaFiscalValor) : undefined;
    if (
      parsedNotaFiscalValor !== undefined &&
      (!Number.isFinite(parsedNotaFiscalValor) || parsedNotaFiscalValor < 0)
    ) {
      setError("Informe um valor de nota fiscal válido.");
      return;
    }

    setSubmitting(true);
    try {
      const appointmentId = await createAppointment({
        dogId,
        solicitanteId,
        veterinarioUserId,
        tipoAtendimento,
        dataAtendimento: parsedDate,
        historico: historico.trim(),
        servicos: servicos.map((line) => ({
          service_id: line.serviceId,
          quantidade: parseNumber(line.quantidade),
          valor_unitario: parseNumber(line.valorUnitario),
        })),
        insumos: insumos.map((line) => ({
          supply_id: line.supplyId,
          quantidade: parseNumber(line.quantidade),
          valor_unitario: parseNumber(line.valorUnitario),
        })),
        descontoValor: parsedDiscount,
        notaFiscalStorageId: notaFiscalStorageId,
        notaFiscalNumero: notaFiscalNumero.trim() || undefined,
        notaFiscalValor: parsedNotaFiscalValor,
        dataEmissaoNotaFiscal: dataEmissaoNotaFiscal
          ? new Date(`${dataEmissaoNotaFiscal}T12:00:00`).getTime()
          : undefined,
      });
      void navigate(`/appointments/${appointmentId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível registrar o atendimento."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Registre o atendimento, os itens utilizados e a nota fiscal correspondente."
        title="Novo atendimento"
      />

      <form className="flex max-w-3xl flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
        <Fieldset title="Atendimento">
          <div className="relative flex flex-col gap-2">
            <Label htmlFor="appointment-dog-search">Animal atendido</Label>
            <Input
              autoComplete="off"
              id="appointment-dog-search"
              onChange={(event) => {
                setDogSearch(event.target.value);
                setDogId(undefined);
                setDogName("");
              }}
              placeholder="Buscar por nome ou microchip"
              value={dogName || dogSearch}
            />
            {dogResults.results.length > 0 && !dogId ? (
              <ul className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
                {dogResults.results.map((dog) => (
                  <li key={dog._id}>
                    <button
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50"
                      onClick={() => {
                        setDogId(dog._id);
                        setDogName(dog.nome);
                        setDogSearch("");
                      }}
                      type="button"
                    >
                      {dog.nome} {dog.microchip ? `· ${dog.microchip}` : "· Sem microchip"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {dogId ? <p className="text-xs text-success">Animal selecionado.</p> : null}
          </div>

          <div className="relative flex flex-col gap-2">
            <Label htmlFor="appointment-person-search">Pessoa solicitante (opcional)</Label>
            <Input
              autoComplete="off"
              id="appointment-person-search"
              onChange={(event) => {
                setPersonSearch(event.target.value);
                setSolicitanteId(undefined);
                setPersonName("");
              }}
              placeholder="Quem trouxe o animal?"
              value={personName || personSearch}
            />
            {personResults.results.length > 0 && !solicitanteId ? (
              <ul className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
                {personResults.results.map((person) => (
                  <li key={person._id}>
                    <button
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50"
                      onClick={() => {
                        setSolicitanteId(person._id);
                        setPersonName(person.nome_completo);
                        setPersonSearch("");
                      }}
                      type="button"
                    >
                      {person.nome_completo}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {solicitanteId ? (
              <button
                className="self-start text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => {
                  setSolicitanteId(undefined);
                  setPersonName("");
                }}
                type="button"
              >
                Remover pessoa solicitante
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="appointment-veterinarian">Veterinário responsável</Label>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="appointment-veterinarian"
                onChange={(event) => setVeterinarioUserId(event.target.value as Id<"users"> | "")}
                value={veterinarioUserId}
              >
                <option value="">Selecione</option>
                {veterinarians?.map((veterinarian) => (
                  <option key={veterinarian._id} value={veterinarian._id}>
                    {veterinarian.nome}
                  </option>
                ))}
              </select>
              {veterinarians && veterinarians.length === 0 ? (
                <p className="text-xs text-warning">Nenhum usuário está marcado como veterinário.</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="appointment-type">Tipo de atendimento</Label>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="appointment-type"
                onChange={(event) => setTipoAtendimento(event.target.value as AppointmentType)}
                value={tipoAtendimento}
              >
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {APPOINTMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="appointment-date">Data e hora</Label>
            <DatePicker
              id="appointment-date"
              onChange={setDataAtendimento}
              value={dataAtendimento}
              withTime
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="appointment-history">Histórico do atendimento</Label>
            <textarea
              className="min-h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="appointment-history"
              onChange={(event) => setHistorico(event.target.value)}
              placeholder="Descreva o que foi realizado, queixas e observações relevantes."
              value={historico}
            />
          </div>
        </Fieldset>

        <Fieldset title="Serviços e insumos">
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-service">Adicionar serviço</Label>
            <select
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="add-service"
              onChange={(event) => {
                const service = serviceCatalog?.find((item) => item._id === event.target.value);
                if (service) addService(service);
                event.currentTarget.value = "";
              }}
              value=""
            >
              <option value="">Selecione um serviço do catálogo</option>
              {serviceCatalog?.map((service) => (
                <option key={service._id} value={service._id}>
                  {service.nome} · {formatCurrency(service.valor_padrao)}
                </option>
              ))}
            </select>
          </div>
          {servicos.map((line, index) => {
            const service = serviceCatalog?.find((item) => item._id === line.serviceId);
            return (
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-[1fr_8rem_9rem_auto] sm:items-end" key={line.serviceId}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{service?.nome ?? "Serviço"}</p>
                  <p className="text-xs text-muted-foreground">Valor padrão: {formatCurrency(service?.valor_padrao ?? 0)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`service-quantity-${line.serviceId}`}>Quantidade</Label>
                  <Input
                    id={`service-quantity-${line.serviceId}`}
                    min="0.01"
                    onChange={(event) =>
                      setServicos((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, quantidade: event.target.value } : item,
                        ),
                      )
                    }
                    step="0.01"
                    type="number"
                    value={line.quantidade}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`service-value-${line.serviceId}`}>Valor unitário</Label>
                  <Input
                    id={`service-value-${line.serviceId}`}
                    inputMode="decimal"
                    onChange={(event) =>
                      setServicos((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, valorUnitario: event.target.value } : item,
                        ),
                      )
                    }
                    value={line.valorUnitario}
                  />
                </div>
                <Button
                  aria-label={`Remover ${service?.nome ?? "serviço"}`}
                  className="min-h-11 sm:size-11 sm:p-0"
                  onClick={() => setServicos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon aria-hidden="true" className="mr-2 size-4 sm:mr-0" />
                  <span className="sm:sr-only">Remover</span>
                </Button>
              </div>
            );
          })}

          <div className="flex flex-col gap-2 border-t pt-4">
            <Label htmlFor="add-supply">Adicionar insumo</Label>
            <select
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="add-supply"
              onChange={(event) => {
                const supply = supplyCatalog?.find((item) => item._id === event.target.value);
                if (supply) addSupply(supply);
                event.currentTarget.value = "";
              }}
              value=""
            >
              <option value="">Selecione um insumo do catálogo</option>
              {supplyCatalog?.map((supply) => (
                <option key={supply._id} value={supply._id}>
                  {supply.nome} · {formatCurrency(supply.valor_padrao)}
                  {supply.unidade_medida ? ` / ${supply.unidade_medida}` : ""}
                </option>
              ))}
            </select>
          </div>
          {insumos.map((line, index) => {
            const supply = supplyCatalog?.find((item) => item._id === line.supplyId);
            return (
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-[1fr_8rem_9rem_auto] sm:items-end" key={line.supplyId}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{supply?.nome ?? "Insumo"}</p>
                  <p className="text-xs text-muted-foreground">{supply?.unidade_medida ?? "Unidade não informada"}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`supply-quantity-${line.supplyId}`}>Quantidade</Label>
                  <Input
                    id={`supply-quantity-${line.supplyId}`}
                    min="0.01"
                    onChange={(event) =>
                      setInsumos((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, quantidade: event.target.value } : item,
                        ),
                      )
                    }
                    step="0.01"
                    type="number"
                    value={line.quantidade}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`supply-value-${line.supplyId}`}>Valor unitário</Label>
                  <Input
                    id={`supply-value-${line.supplyId}`}
                    inputMode="decimal"
                    onChange={(event) =>
                      setInsumos((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, valorUnitario: event.target.value } : item,
                        ),
                      )
                    }
                    value={line.valorUnitario}
                  />
                </div>
                <Button
                  aria-label={`Remover ${supply?.nome ?? "insumo"}`}
                  className="min-h-11 sm:size-11 sm:p-0"
                  onClick={() => setInsumos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon aria-hidden="true" className="mr-2 size-4 sm:mr-0" />
                  <span className="sm:sr-only">Remover</span>
                </Button>
              </div>
            );
          })}

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="appointment-discount">Desconto (R$)</Label>
              <Input
                id="appointment-discount"
                inputMode="decimal"
                min="0"
                onChange={(event) => setDesconto(event.target.value)}
                value={desconto}
              />
            </div>
            <div className="flex items-end justify-between rounded-xl bg-primary/8 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total do atendimento</span>
              <strong className="text-xl tabular-nums">{formatCurrency(total)}</strong>
            </div>
          </div>
        </Fieldset>

        <Fieldset title="Nota fiscal">
          <NotaFiscalUpload
            fileName={notaFiscalFileName}
            onChange={(storageId, fileName) => {
              setNotaFiscalStorageId(storageId);
              setNotaFiscalFileName(fileName);
            }}
            onParsed={(suggestion) => {
              if (suggestion.numero) setNotaFiscalNumero(suggestion.numero);
              if (suggestion.valor_total !== null) setNotaFiscalValor(String(suggestion.valor_total));
              if (suggestion.data_emissao !== null) setDataEmissaoNotaFiscal(localDateValue(suggestion.data_emissao));
            }}
            storageId={notaFiscalStorageId}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice-number">Número da nota</Label>
              <Input id="invoice-number" onChange={(event) => setNotaFiscalNumero(event.target.value)} value={notaFiscalNumero} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice-value">Valor da nota (R$)</Label>
              <Input id="invoice-value" inputMode="decimal" onChange={(event) => setNotaFiscalValor(event.target.value)} value={notaFiscalValor} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice-date">Emissão</Label>
              <DatePicker id="invoice-date" onChange={setDataEmissaoNotaFiscal} value={dataEmissaoNotaFiscal} />
            </div>
          </div>
        </Fieldset>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" disabled={submitting} type="submit">
            <PlusIcon aria-hidden="true" className="mr-2 size-4" />
            {submitting ? "Salvando…" : "Registrar atendimento"}
          </Button>
          <Button asChild className="min-h-11" type="button" variant="outline">
            <Link to="/appointments">Cancelar</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
