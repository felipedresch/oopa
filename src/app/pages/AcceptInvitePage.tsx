import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { getErrorMessage } from "@/lib/auth-errors";

export function AcceptInvitePage() {
  const { token = "" } = useParams();
  const preview = useQuery(api.users.getInvitePreview, token ? { token } : "skip");
  const acceptInvite = useAction(api.users.acceptInvite);
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <p className="text-sm text-destructive">Link de convite invalido.</p>;
  }

  if (preview === undefined) {
    return <LoadingSkeleton rows={3} />;
  }

  if (preview.status !== "valid") {
    const messages = {
      expired: "Este convite expirou. Solicite um novo convite a ONG.",
      used: "Este convite ja foi utilizado.",
      invalid: "Convite invalido.",
    };
    return (
      <Card>
        <CardHeader>
          <CardTitle>Convite indisponivel</CardTitle>
          <CardDescription>{messages[preview.status]}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/login">
            Ir para login
          </Link>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await acceptInvite({ token, password });
      await signIn("password", {
        flow: "signIn",
        email: preview.email,
        password,
      });
      void navigate("/");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Nao foi possivel aceitar o convite."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aceitar convite</CardTitle>
        <CardDescription>Crie sua senha para acessar o OOPA.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input disabled id="nome" readOnly value={preview.nome} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input disabled id="email" readOnly type="email" value={preview.email} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organizacao">Organizacao</Label>
            <Input disabled id="organizacao" readOnly value={preview.organizacao} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="min-h-11" disabled={loading} type="submit">
            {loading ? "Criando acesso..." : "Criar senha e entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
