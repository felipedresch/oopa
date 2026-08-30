import { DogIcon } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

/**
 * Layout do canal publico de denuncias. Separado do `AuthLayout` porque o
 * publico aqui nao e a equipe da ONG: o formulario precisa de mais largura,
 * cabecalho proprio e rodape com orientacao de emergencia.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-2.5 rounded-lg" to="/denuncia">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <DogIcon aria-hidden="true" className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-heading text-lg font-bold tracking-tight">
                oopa
              </span>
              <span className="block text-xs text-muted-foreground">
                Canal de denúncias
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-3xl text-xs leading-5 text-muted-foreground">
          Em caso de risco imediato à vida do animal ou de flagrante, acione também a
          Polícia Militar pelo <span className="font-medium text-foreground">190</span>.
          Maus-tratos são crime (Lei Federal 9.605/98, art. 32).
        </p>
      </footer>
    </div>
  );
}
