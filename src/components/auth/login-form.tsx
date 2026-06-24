"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/brand";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotMessage("");
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setForgotMessage(data.message ?? "Solicitud enviada");
  }

  if (showForgot) {
    return (
      <Card className="glass-card w-full max-w-md animate-page-enter rounded-3xl" style={{ animationDelay: "120ms" }}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Recuperar acceso</CardTitle>
          <CardDescription>
            Se notificará a un administrador para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {forgotMessage && (
              <p className="text-sm text-emerald-600">{forgotMessage}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Enviar solicitud
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowForgot(false)}
            >
              Volver al login
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card w-full max-w-md animate-page-enter rounded-3xl border-white/60 shadow-2xl" style={{ animationDelay: "120ms" }}>
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Ingresar a {BRAND.name}</CardTitle>
        <CardDescription>
          Ingresá con tu cuenta de la cooperativa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="empleado@cooperativa.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowForgot(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo: admin@vertia.local / gerente@vertia.local / empleado@vertia.local
            <br />
            Contraseña: password123
          </p>
        )}
        <p className="mt-2 text-center text-xs">
          <Link href="/reset-password" className="text-primary hover:underline">
            Tengo un token de restablecimiento
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
