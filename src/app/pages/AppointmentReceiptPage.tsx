import { useQuery } from "convex/react";
import { ArrowLeftIcon, PrinterIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCep, formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

export function AppointmentReceiptPage() {
  const { id = "" } = useParams();
  const { can } = usePermissions();
  const [issuedAt] = useState(() => Date.now());
  const appointmentId = id as Id<"service_appointments">;
  const appointment = useQuery(
    api.appointments.get,
    can("appointments.read") && id ? { appointmentId } : "skip",
  );
  const organization = useQuery(api.organization.get, can("appointments.read") ? {} : "skip");

  if (!can("appointments.read")) {
    return <PermissionDenied />;
  }
  if (appointment === undefined || organization === undefined) {
    return <LoadingSkeleton rows={7} />;
  }
  if (!appointment) {
    return <PermissionDenied message="Atendimento não encontrado." />;
  }

  const address = organization
    ? [
        organization.endereco_logradouro,
        organization.endereco_numero,
        organization.endereco_complemento,
        organization.bairro_nome,
        organization.endereco_cep ? formatCep(organization.endereco_cep) : undefined,
      ]
        .filter(Boolean)
        .join(", ")
    : "Dados de endereço não cadastrados";

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button className="min-h-11 print:hidden" onClick={() => window.print()} type="button">
            <PrinterIcon aria-hidden="true" className="mr-2 size-4" />
            Imprimir / salvar PDF
          </Button>
        }
        description="Documento formal para impressão ou salvamento em PDF pelo navegador."
        title="Comprovante de venda"
      />

      {!organization ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning print:hidden">
          Cadastre os dados da ONG antes de emitir comprovantes completos. O documento abaixo pode ser impresso como rascunho.
        </div>
      ) : null}

      <article className="mx-auto w-full max-w-3xl rounded-none border bg-white p-6 text-slate-950 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none sm:p-10">
        <header className="flex flex-col gap-5 border-b-2 border-slate-900 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {organization?.logo_url ? (
              <img alt="Logo da ONG" className="size-16 object-contain" src={organization.logo_url} />
            ) : null}
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight">
                {organization?.nome_fantasia || organization?.razao_social || "Dados da ONG não cadastrados"}
              </h1>
              {organization?.nome_fantasia ? <p className="mt-0.5 text-sm">{organization.razao_social}</p> : null}
              <p className="mt-2 text-xs text-slate-600">CNPJ: {organization ? organization.cnpj : "Não informado"}</p>
              <p className="text-xs text-slate-600">{address}</p>
              {organization?.telefone || organization?.email ? (
                <p className="text-xs text-slate-600">{[organization.telefone, organization.email].filter(Boolean).join(" · ")}</p>
              ) : null}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Comprovante de venda</p>
            <p className="mt-1 text-lg font-bold">Atendimento #{appointment._id.slice(-8).toUpperCase()}</p>
            <p className="text-sm text-slate-600">{formatDateTime(appointment.data_atendimento)}</p>
          </div>
        </header>

        <section className="grid gap-4 border-b py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Animal</p>
            <p className="mt-1 font-semibold">{appointment.dog?.nome ?? "Animal removido"}</p>
            <p className="text-slate-600">{appointment.dog?.especie === "gato" ? "Gato" : "Cão"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsável</p>
            <p className="mt-1 font-semibold">{appointment.solicitante?.nome_completo ?? "Não informado"}</p>
            <p className="text-slate-600">Veterinário: {appointment.veterinario.nome}</p>
          </div>
        </section>

        <table className="mt-6 w-full text-left text-sm">
          <thead className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 text-right font-semibold">Qtd.</th>
              <th className="pb-2 text-right font-semibold">Unitário</th>
              <th className="pb-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {appointment.servicos.map((service) => (
              <tr key={service.service_id}>
                <td className="py-3">{service.nome}<span className="block text-xs text-slate-500">Serviço</span></td>
                <td className="py-3 text-right tabular-nums">{service.quantidade}</td>
                <td className="py-3 text-right tabular-nums">{formatCurrency(service.valor_unitario)}</td>
                <td className="py-3 text-right font-medium tabular-nums">{formatCurrency(service.subtotal)}</td>
              </tr>
            ))}
            {appointment.insumos.map((supply) => (
              <tr key={supply.supply_id}>
                <td className="py-3">{supply.nome}<span className="block text-xs text-slate-500">Insumo</span></td>
                <td className="py-3 text-right tabular-nums">{supply.quantidade}</td>
                <td className="py-3 text-right tabular-nums">{formatCurrency(supply.valor_unitario)}</td>
                <td className="py-3 text-right font-medium tabular-nums">{formatCurrency(supply.subtotal)}</td>
              </tr>
            ))}
            {appointment.servicos.length === 0 && appointment.insumos.length === 0 ? (
              <tr><td className="py-4 text-slate-500" colSpan={4}>Nenhum item lançado.</td></tr>
            ) : null}
          </tbody>
        </table>

        <div className="ml-auto mt-5 flex w-full max-w-xs flex-col gap-2 border-t border-slate-300 pt-4 text-sm">
          <div className="flex justify-between gap-4"><span>Desconto</span><span className="tabular-nums">{formatCurrency(appointment.desconto_valor)}</span></div>
          <div className="flex justify-between gap-4 text-base font-bold"><span>Total</span><span className="tabular-nums">{formatCurrency(appointment.valor_total)}</span></div>
        </div>

        <footer className="mt-12 flex flex-col gap-1 border-t pt-4 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <span>Documento emitido pelo sistema OOPA.</span>
          <span>Data de emissão: {formatDate(issuedAt)}</span>
        </footer>
      </article>

      <Button asChild className="min-h-11 self-start print:hidden" variant="outline">
        <Link to={`/appointments/${appointmentId}`}>
          <ArrowLeftIcon aria-hidden="true" className="mr-2 size-4" />
          Voltar para atendimento
        </Link>
      </Button>
    </section>
  );
}
