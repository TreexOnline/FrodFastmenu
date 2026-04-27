/* ============================================================
   Hook genérico para manter qualquer página "ao vivo" recarregando
   dados sempre que houver INSERT/UPDATE/DELETE em uma ou mais
   tabelas. Faz debounce para evitar enxurrada de chamadas.
   Também recarrega quando a aba volta a ficar visível ou recupera
   foco / conexão — assim o usuário nunca precisa apertar F5.
============================================================ */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeTableSpec {
  table: string;
  /** Filtro estilo Realtime, ex: `user_id=eq.<uuid>` */
  filter?: string;
}

interface Options {
  /** Identificador único do canal — use algo estável por página */
  channelKey: string;
  tables: RealtimeTableSpec[];
  /** Função que recarrega os dados */
  onChange: () => void;
  /** Habilita/desabilita o hook (ex: aguardar user) */
  enabled?: boolean;
  /** Debounce em ms para coalescer eventos seguidos */
  debounceMs?: number;
}

export function useRealtimeRefresh({
  channelKey,
  tables,
  onChange,
  enabled = true,
  debounceMs = 250,
}: Options) {
  // Mantém a referência mais recente do callback para sempre chamar
  // a versão atualizada sem precisar reassinar o canal.
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    let timer: number | undefined;
    const trigger = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          cbRef.current();
        } catch (e) {
          console.warn("[useRealtimeRefresh] callback error", e);
        }
      }, debounceMs);
    };

    let channel = supabase.channel(channelKey);
    for (const t of tables) {
      const cfg: any = { event: "*", schema: "public", table: t.table };
      if (t.filter) cfg.filter = t.filter;
      channel = channel.on("postgres_changes", cfg, trigger);
    }
    channel.subscribe();

    // Recarrega quando a aba volta a ficar visível (após ficar em background)
    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };
    const onFocus = () => trigger();
    const onOnline = () => trigger();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      if (timer) window.clearTimeout(timer);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, enabled, debounceMs, JSON.stringify(tables)]);
}
