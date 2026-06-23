"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al restablecer contraseña");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>
            Introduce el token proporcionado por tu administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="text-center text-emerald-600">
              Contraseña restablecida. Redirigiendo al login...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Token de restablecimiento</Label>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder="Token del administrador"
                />
              </div>
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Procesando..." : "Restablecer contraseña"}
              </Button>
              <Link href="/" className="block text-center text-sm text-muted-foreground hover:underline">
                Volver al login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
