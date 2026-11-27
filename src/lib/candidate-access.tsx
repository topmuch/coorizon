"use client";

import * as React from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Candidate access state returned by GET /api/candidate/access.
 * `hasFormationAccess` is true once the administration has validated the
 * formation forfait payment (380 000 FCFA by default).
 */
export interface CandidateAccessState {
  hasFormationAccess: boolean;
  forfait: {
    name: string;
    description: string;
    amount: number;
    currency: string;
    durationLabel: string;
  };
  pendingRequest: {
    id: string;
    createdAt: string;
    amount: number;
    currency: string;
  } | null;
  paidRequest: {
    id: string;
    invoiceNumber: string;
    paidAt: string;
  } | null;
}

export interface CandidateAccessContextValue {
  access: CandidateAccessState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  buyForfait: () => Promise<{ ok: boolean; error?: string }>;
}

// ─── Context ───────────────────────────────────────────────────────────────

/**
 * Safe default OUTSIDE the provider: consumers never crash even when the
 * hook is used without a surrounding CandidateAccessProvider.
 */
const CandidateAccessContext =
  React.createContext<CandidateAccessContextValue>({
    access: null,
    loading: false,
    refresh: async () => {},
    buyForfait: async () => ({ ok: false, error: "Indisponible." }),
  });

// ─── Provider ──────────────────────────────────────────────────────────────

export function CandidateAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [access, setAccess] = React.useState<CandidateAccessState | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/access", {
        credentials: "include",
      });
      if (!res.ok) {
        setAccess(null);
        return;
      }
      const data = (await res.json()) as CandidateAccessState;
      setAccess(data);
    } catch {
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const buyForfait =
    React.useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/candidate/forfait", {
          method: "POST",
          credentials: "include",
        });
        if (res.status === 201) {
          await refresh();
          return { ok: true };
        }
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        return {
          ok: false,
          error:
            data.error ??
            "Impossible d'enregistrer votre demande. Veuillez réessayer.",
        };
      } catch {
        return {
          ok: false,
          error:
            "Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.",
        };
      }
    }, [refresh]);

  const value = React.useMemo(
    () => ({ access, loading, refresh, buyForfait }),
    [access, loading, refresh, buyForfait]
  );

  return (
    <CandidateAccessContext.Provider value={value}>
      {children}
    </CandidateAccessContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useCandidateAccess(): CandidateAccessContextValue {
  return React.useContext(CandidateAccessContext);
}
