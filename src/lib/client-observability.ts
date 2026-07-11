export async function reportClientError(error: Error & { digest?: string }) {
  try {
    await fetch("/api/observability/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    });
  } catch {
    // Silencioso — no bloquear UI por telemetría
  }
}
