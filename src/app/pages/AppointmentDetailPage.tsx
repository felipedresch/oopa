import { useMutation, useQuery } from "convex/react";
import { ArrowLeftIcon, FileTextIcon, PrinterIcon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  appointmentStatusBadgeClass,
} from "@/lib/domain-colors";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

const CLINICAL_TYPES = new Set([
  "consulta",
  "vacina",
  "cirurgia",
  "exame",
  "castracao",
  "emergencia",
]);

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-6">{children}</dd>
    </div>
  );
}

function TextRecordField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

export function AppointmentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const appointmentId = id as Id<"service_appointments">;
  const appointment = useQuery(
    api.appointments.get,
    can("appointments.read") && id ? { appointmentId } : "skip",
  );
  const complete = useMutation(api.appointments.complete);
  const cancel = useMutation(api.appointments.cancel);
  const [anamnese, setAnamnese] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [procedimentos, setProcedimentos] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [peso, setPeso] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!can("appointments.read")) {
    return <PermissionDenied />;
  }
  if (appointment === undefined) {
    return <LoadingSkeleton rows={6} />;
  }
  if (!appointment) {
    return <PermissionDenied message="Atendimento não encontrado." />;
  }

  const handleComplete = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsedPeso = peso ? Number(peso.replace(",", ".")) : undefined;
    const parsedTemperatura = temperatura ? Number(temperatura.replace(",", ".")) : undefined;
    if (parsedPeso !== undefined && (!Number.isFinite(parsedPeso) || parsedPeso <= 0)) {
      setError("Informe um peso válido.");
      return;
    }
    if (
      parsedTemperatura !== undefined &&
      (!Number.isFinite(parsedTemperatura) || parsedTemperatura <= 0)
    ) {
      setError("Informe uma temperatura válida.");
      return;
    }

    setSaving(true);
    try {
      await complete({
        appointmentId,
        medicalRecord: {
          anamnese: anamnese.trim() || undefined,
          diagnostico: diagnostico.trim() || undefined,
          procedimentos: procedimentos.trim() || undefined,
          medicamentos: medicamentos.trim() || undefined,
          peso_kg: parsedPeso,
          temperatura_c: parsedTemperatura,
        },
      });
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível concluir o atendimento."));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancelar este atendimento?")) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await cancel({ appointmentId });
      void navigate("/appointments");
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível cancelar o atendimento."));
    } finally {
      setSaving(false);
    }
  };

  const record = appointment.medical_record;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/appointments/${appointmentId}/receipt`}>
                <PrinterIcon aria-hidden="true" className="mr-2 size-4" />
                Comprovante
              </Link>
            </Button>
            {appointment.status === "agendado" && can("appointments.manage") ? (
              <Button className="min-h-11" onClick={() => void handleCancel()} type="button" variant="outline">
                Cancelar atendimento
              </Button>
            ) : null}
          </div>
        }
        description={`${APPOINTMENT_TYPE_LABELS[appointment.tipo_atendimento]} · ${formatDateTime(appointment.data_atendimento)}`}
        title={appointment.dog?.nome ?? "Atendimento"}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={appointmentStatusBadgeClass[appointment.status]} variant="secondary">
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </Badge>
        {appointment.dog?.microchip ? (
          <Badge variant="outline">Microchip {appointment.dog.microchip}</Badge>
        ) : (
          <Badge className="bg-warning/14 text-warning" variant="secondary">Sem microchip</Badge>
        )}
      </div>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Dados do atendimento</h2>
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <DetailField label="Animal">
            {appointment.dog ? (
              <Link className="text-primary underline-offset-2 hover:underline" to={`/dogs/${appointment.dog._id}`}>
                {appointment.dog.nome}
              </Link>
            ) : "Animal removido"}
          </DetailField>
          <DetailField label="Veterinário">{appointment.veterinario.nome}</DetailField>
          <DetailField label="Pessoa solicitante">
            {appointment.solicitante ? (
              <Link className="text-primary underline-offset-2 hover:underline" to={`/people/${appointment.solicitante._id}`}>
                {appointment.solicitante.nome_completo}
              </Link>
            ) : "Não informado"}
          </DetailField>
          <DetailField label="Valor total">{formatCurrency(appointment.valor_total)}</DetailField>
          <div className="sm:col-span-2">
            <DetailField label="Histórico">{appointment.historico}</DetailField>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Itens lançados</h2>
        <div className="flex flex-col divide-y divide-border">
          {appointment.servicos.map((service) => (
            <div className="flex items-center justify-between gap-3 py-3 first:pt-0" key={service.service_id}>
              <div>
                <p className="text-sm font-medium">{service.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Serviço · {service.quantidade} × {formatCurrency(service.valor_unitario)}
                </p>
              </div>
              <span className="text-sm font-medium tabular-nums">{formatCurrency(service.subtotal)}</span>
            </div>
          ))}
          {appointment.insumos.map((supply) => (
            <div className="flex items-center justify-between gap-3 py-3" key={supply.supply_id}>
              <div>
                <p className="text-sm font-medium">{supply.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Insumo · {supply.quantidade} × {formatCurrency(supply.valor_unitario)}
                  {supply.unidade_medida ? ` / ${supply.unidade_medida}` : ""}
                </p>
              </div>
              <span className="text-sm font-medium tabular-nums">{formatCurrency(supply.subtotal)}</span>
            </div>
          ))}
          {appointment.servicos.length === 0 && appointment.insumos.length === 0 ? (
            <p className="py-1 text-sm text-muted-foreground">Nenhum serviço ou insumo lançado.</p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col items-end gap-1 border-t pt-4 text-sm">
          <span className="text-muted-foreground">Desconto: {formatCurrency(appointment.desconto_valor)}</span>
          <strong className="text-lg tabular-nums">Total: {formatCurrency(appointment.valor_total)}</strong>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Nota fiscal</h2>
        {appointment.nota_fiscal_url ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileTextIcon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  Nota {appointment.nota_fiscal_numero ? `nº ${appointment.nota_fiscal_numero}` : "anexada"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointment.data_emissao_nota_fiscal
                    ? `Emitida em ${formatDate(appointment.data_emissao_nota_fiscal)}`
                    : "Data de emissão não informada"}
                  {appointment.nota_fiscal_valor !== undefined
                    ? ` · ${formatCurrency(appointment.nota_fiscal_valor)}`
                    : ""}
                </p>
              </div>
            </div>
            <Button asChild className="min-h-10" variant="outline">
              <a href={appointment.nota_fiscal_url} rel="noreferrer" target="_blank">Abrir nota fiscal</a>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma nota fiscal anexada.</p>
        )}
      </section>

      {record ? (
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">Prontuário médico</h2>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <DetailField label="Data">{formatDate(record.data_atendimento)}</DetailField>
            <DetailField label="Veterinário">{record.veterinario.nome}</DetailField>
            {record.anamnese ? <DetailField label="Anamnese">{record.anamnese}</DetailField> : null}
            {record.diagnostico ? <DetailField label="Diagnóstico">{record.diagnostico}</DetailField> : null}
            {record.procedimentos ? <DetailField label="Procedimentos">{record.procedimentos}</DetailField> : null}
            {record.medicamentos ? <DetailField label="Medicamentos">{record.medicamentos}</DetailField> : null}
            {record.peso_kg !== undefined ? <DetailField label="Peso">{record.peso_kg} kg</DetailField> : null}
            {record.temperatura_c !== undefined ? <DetailField label="Temperatura">{record.temperatura_c} °C</DetailField> : null}
          </dl>
        </section>
      ) : appointment.status === "agendado" && CLINICAL_TYPES.has(appointment.tipo_atendimento) && can("appointments.manage") ? (
        <form className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5" onSubmit={(event) => void handleComplete(event)}>
          <div>
            <h2 className="font-semibold">Concluir e registrar prontuário</h2>
            <p className="mt-1 text-sm text-muted-foreground">Preencha o que estiver disponível. Os campos podem ficar em branco.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextRecordField id="record-anamnese" label="Anamnese" onChange={setAnamnese} value={anamnese} />
            <TextRecordField id="record-diagnostico" label="Diagnóstico" onChange={setDiagnostico} value={diagnostico} />
            <TextRecordField id="record-procedimentos" label="Procedimentos" onChange={setProcedimentos} value={procedimentos} />
            <TextRecordField id="record-medicamentos" label="Medicamentos" onChange={setMedicamentos} value={medicamentos} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="record-weight">Peso (kg)</Label>
              <Input id="record-weight" inputMode="decimal" onChange={(event) => setPeso(event.target.value)} value={peso} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="record-temperature">Temperatura (°C)</Label>
              <Input id="record-temperature" inputMode="decimal" onChange={(event) => setTemperatura(event.target.value)} value={temperatura} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="min-h-11 self-start" disabled={saving} type="submit">
            {saving ? "Salvando…" : "Concluir atendimento"}
          </Button>
        </form>
      ) : null}

      {error && !record && !(appointment.status === "agendado" && CLINICAL_TYPES.has(appointment.tipo_atendimento)) ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <Button asChild className="min-h-11 self-start" variant="outline">
        <Link to="/appointments">
          <ArrowLeftIcon aria-hidden="true" className="mr-2 size-4" />
          Voltar para atendimentos
        </Link>
      </Button>
    </section>
  );
}
