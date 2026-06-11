import { useMutation } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/auth-errors";

export function RequestResetPage() {
  const requestReset = useMutation(api.users.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await requestReset({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Nao foi possivel solicitar o reset."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>
          Enviaremos um link para o email cadastrado, se existir uma conta ativa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Se o email estiver cadastrado, voce recebera um link valido por 60 minutos.
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="min-h-11" disabled={loading} type="submit">
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}
        <Link
          className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
          to="/login"
        >
          Voltar para login
        </Link>
      </CardContent>
    </Card>
  );
}
