"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ORG_SLUG_STORAGE_KEY = "scoreops.lastOrgSlug";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORG_SLUG_STORAGE_KEY);
      if (saved) setOrgSlug(saved);
    } catch {
      // localStorage puede fallar en modo privado
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const slug = orgSlug.trim().toLowerCase();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          orgSlug: slug,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }

      try {
        localStorage.setItem(ORG_SLUG_STORAGE_KEY, slug);
      } catch {
        // ignore
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
    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setForgotMessage(data.message ?? "Solicitud enviada");
    } catch {
      setError("Error de conexión");
    } finally {
      setForgotLoading(false);
    }
  }

  if (showForgot) {
    return (
      <Card
        className="login-panel w-full max-w-md animate-page-enter rounded-2xl"
        style={{ animationDelay: "120ms" }}
      >
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl font-bold tracking-tight">Recuperar acceso</CardTitle>
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
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {forgotMessage && (
              <p className="text-sm text-emerald-600">{forgotMessage}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={forgotLoading}>
              {forgotLoading ? "Enviando..." : "Enviar solicitud"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Si ya te dieron un token,{" "}
              <Link href="/reset-password" className="text-primary hover:underline">
                usalo acá
              </Link>
              .
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowForgot(false);
                setForgotMessage("");
                setError("");
              }}
            >
              Volver al login
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="login-panel w-full max-w-md animate-page-enter rounded-2xl"
      style={{ animationDelay: "120ms" }}
    >
      <CardHeader className="text-center pb-2">
        <CardTitle className="font-display text-2xl font-bold tracking-tight">
          Ingresar
        </CardTitle>
        <CardDescription>
          Usá el código de tu empresa, tu email y la contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgSlug">Empresa (código)</Label>
            <Input
              id="orgSlug"
              name="organization"
              placeholder="ej. demo, acme, vertia"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              autoComplete="organization"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Pedíselo a tu administrador si no lo sabés (ej. demo).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="username"
              type="email"
              placeholder="empleado@cooperativa.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  setShowForgot(true);
                  setError("");
                  setForgotMessage("");
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo Cooperativa Demo (código: demo):
            <br />
            admin@vertia.local / gerente@vertia.local / empleado@vertia.local
            <br />
            Contraseña: password123
          </p>
        )}
      </CardContent>
    </Card>
  );
}
