/* ============================================================
   Hook global de notificação sonora + DETECÇÃO de novos pedidos.

   Estratégia em DUAS camadas para máxima confiabilidade:
   1) Realtime (Supabase) — captura INSERT em "orders" instantaneamente.
   2) Polling invisível a cada 2s — fallback caso Realtime caia,
      a aba esteja em background, ou a conexão tenha oscilado.

   Toda detecção é deduplicada por ID em um Set global, então o som
   nunca toca duas vezes para o mesmo pedido — mesmo que ambas as
   camadas detectem o mesmo INSERT.

   O som é uma campainha "ding-dong" alta, tocada 3x para chamar
   bem a atenção. Desbloqueia autoplay no primeiro gesto do usuário.
============================================================ */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printOrder } from "@/utils/electronPrint";

const SOUND_URL = "/sounds/new-order.mp3?v=20260425";
const POLL_INTERVAL_MS = 2000;

// Set global compartilhado entre instâncias do hook e entre as duas
// camadas de detecção (realtime + polling) — garante que o mesmo
// pedido nunca dispare som/toast duas vezes.
const GLOBAL_SEEN = new Set<string>();

export function useNewOrderSound(userId: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const armedRef = useRef(false);
  // Marca o momento em que começamos a observar — qualquer pedido
  // anterior a isso é considerado "já existente" e não toca som.
  const startedAtRef = useRef<string>(new Date().toISOString());

  // Cria o elemento <audio> uma única vez
  useEffect(() => {
    const a = new Audio(SOUND_URL);
    a.preload = "auto";
    a.volume = 1.0;
    audioRef.current = a;

    // Desbloqueia autoplay no primeiro gesto do usuário
    const arm = () => {
      if (armedRef.current) return;
      armedRef.current = true;
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        })
        .catch(() => {
          a.muted = false;
        });
    };
    window.addEventListener("click", arm, { once: false });
    window.addEventListener("keydown", arm, { once: false });
    window.addEventListener("touchstart", arm, { once: false });

    return () => {
      window.removeEventListener("click", arm);
      window.removeEventListener("keydown", arm);
      window.removeEventListener("touchstart", arm);
      a.pause();
    };
  }, []);

  const play = () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.volume = 1.0;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          toast.message("Clique em qualquer lugar para ativar o som de novos pedidos.");
        });
      }
      // Mantém o alerta curto, sem repetir a campainha.
      window.setTimeout(() => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      }, 1200);
    } catch {}
  };

  // Notifica um pedido novo (deduplicado)
  const notifyNewOrder = (order: { id: string; customer_name?: string | null; is_manual?: boolean | null }) => {
    if (!order?.id) return;
    if (GLOBAL_SEEN.has(order.id)) return;
    GLOBAL_SEEN.add(order.id);
    if (order.is_manual) return; // pedidos criados manualmente no painel não tocam som
    
    // Toca som de notificação
    play();
    
    // Mostra toast
    toast.success(`🔔 Novo pedido de ${order.customer_name || "cliente"}!`, {
      duration: 6000,
    });
    
    // Dispara impressão automática se estiver no Electron
    printOrder(order.id, order.customer_name || undefined);
  };

  // ===== Camada 1: Realtime =====
  useEffect(() => {
    if (!userId) return;
    startedAtRef.current = new Date().toISOString();

    const channel = supabase
      .channel(`orders-global-sound-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          notifyNewOrder(payload.new as any);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ===== Camada 2: Polling invisível a cada 2s =====
  // Faz uma consulta enxuta apenas pelos pedidos criados após o início
  // da sessão. É barato (poucos bytes) e garante que o som dispare
  // mesmo que o Realtime tenha caído ou a aba esteja em segundo plano.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, customer_name, is_manual, created_at")
          .eq("user_id", userId)
          .gt("created_at", startedAtRef.current)
          .order("created_at", { ascending: true })
          .limit(20);
        if (error) {
          // Não loga em produção pra não poluir, mas mantém visível em dev
          if (import.meta.env.DEV) console.warn("[poll orders]", error.message);
          return;
        }
        for (const o of data || []) {
          notifyNewOrder(o as any);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn("[poll orders] exception", e);
      } finally {
        inFlight = false;
      }
    };

    // Primeira execução imediata e depois a cada POLL_INTERVAL_MS
    const id = window.setInterval(() => {
      // setTimeout 0 mantém o callback async sem bloquear o tick do interval
      window.setTimeout(poll, 0);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
