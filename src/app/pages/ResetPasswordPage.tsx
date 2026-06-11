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

export function ResetPasswordPage() {
  const { token = "" } = useParams();
  const preview = useQuery(api.users.getResetPreview, token ? { token } : "skip");
  const resetPassword = useAction(api.users.resetPasswordWithToken);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <p className="text-sm text-destructive">Link invalido.</p>;
  }

  if (preview === undefined) {
    return <LoadingSkeleton rows={3} />;
  }

  if (preview.status !== "valid") {
    const messages = {
      expired: "Este link expirou. Solicite um novo reset.",
      used: "Este link ja foi utilizado.",
      invalid: "Link invalido.",
    };
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link indisponivel</CardTitle>
          <CardDescription>{messages[preview.status]}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/reset-password">
            Solicitar novo link
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
      await resetPassword({ token, password });
      void navigate("/login");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Nao foi possivel redefinir a senha."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar nova senha</CardTitle>
        <CardDescription>Escolha uma senha com pelo menos 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Nova senha</Label>
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
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
