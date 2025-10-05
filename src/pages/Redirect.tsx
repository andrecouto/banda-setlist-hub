import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function Redirect() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const targetUrl = useMemo(() => {
    const to = searchParams.get("to");
    if (!to) return null;
    try {
      const decoded = decodeURIComponent(to);
      const url = new URL(decoded);
      const allowedHosts = new Set(["wa.me", "api.whatsapp.com"]);
      if (url.protocol !== "https:" || !allowedHosts.has(url.host)) {
        setError("Destino inválido.");
        return null;
      }
      return url.toString();
    } catch {
      setError("URL inválida.");
      return null;
    }
  }, [searchParams]);

  useEffect(() => {
    if (targetUrl) {
      // Fazer o redirecionamento em nível de aba (fora do iframe do preview)
      window.location.replace(targetUrl);
    }
  }, [targetUrl]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center space-y-2">
        {!error ? (
          <>
            <h1 className="text-xl font-semibold">Abrindo WhatsApp…</h1>
            <p className="text-sm text-muted-foreground">Caso não abra, verifique o bloqueador de pop‑ups e tente novamente.</p>
            {targetUrl && (
              <p className="text-xs break-all text-muted-foreground">Destino: {targetUrl}</p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Não foi possível redirecionar</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        )}
      </div>
    </main>
  );
}
