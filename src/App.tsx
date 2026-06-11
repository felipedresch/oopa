import { CheckCircle2Icon, ShieldCheckIcon, TestTube2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

const foundationItems = [
  {
    icon: CheckCircle2Icon,
    title: "Qualidade como porta de saida",
    description: "Lint, typecheck, testes e build reunidos em npm run quality.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Backend Convex preparado",
    description: "Deployment cloud, codegen e AI files instalados pelo CLI.",
  },
  {
    icon: TestTube2Icon,
    title: "Testes desde o primeiro dia",
    description: "Vitest, Testing Library e Playwright configurados no scaffold.",
  },
];

function App() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center gap-10 px-6 py-12">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="text-sm font-medium text-muted-foreground">OOPA</p>
          <h1 className="text-4xl font-semibold tracking-normal text-balance sm:text-5xl">
            Fundacao tecnica pronta para construir o sistema com seguranca.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Este scaffold inicializa a stack definida: React, TypeScript, Tailwind,
            shadcn/ui, Convex e uma esteira de qualidade para orientar as proximas
            entregas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {foundationItems.map((item) => (
            <article
              key={item.title}
              className="flex min-h-40 flex-col gap-4 rounded-lg border bg-card p-5 text-card-foreground"
            >
              <item.icon aria-hidden="true" className="text-muted-foreground" />
              <div className="flex flex-col gap-2">
                <h2 className="text-base font-medium">{item.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div>
          <Button asChild variant="outline">
            <a href="https://docs.convex.dev/ai" rel="noreferrer" target="_blank">
              Convex AI docs
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}

export default App;
