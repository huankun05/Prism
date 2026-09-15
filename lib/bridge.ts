"use client";

/** Browser client for the local Prism bridge (WebSocket). */

export type BridgeStatus = "idle" | "connecting" | "connected" | "disconnected" | "unsupported";

export type BridgeMessage =
  | { type: "apply"; opId?: string; design: unknown }
  | { type: "command"; opId?: string; command: unknown }
  | { type: "hello-ack"; ok?: boolean }
  | { type: "patch"; opId?: string; patch: unknown };

export type BridgeClientHandlers = {
  onStatus?: (status: BridgeStatus) => void;
  onApply?: (design: unknown) => void;
  onCommand?: (command: unknown) => void;
  onHello?: () => void;
};

const DEFAULT_PORT = 7331;

export function bridgeUrl(): string {
  const port = process.env.NEXT_PUBLIC_BRIDGE_PORT || DEFAULT_PORT;
  return `ws://127.0.0.1:${port}/ws`;
}

/**
 * Connect to the local bridge. Returns a disconnect function.
 * Safe to call in non-browser environments (no-op).
 */
export function connectBridge(handlers: BridgeClientHandlers, hello?: Record<string, unknown>): () => void {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") {
    handlers.onStatus?.("unsupported");
    return () => {};
  }

  let closed = false;
  let ws: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const setStatus = (s: BridgeStatus) => handlers.onStatus?.(s);

  const open = () => {
    if (closed) return;
    setStatus("connecting");
    try {
      ws = new WebSocket(bridgeUrl());
    } catch {
      setStatus("disconnected");
      scheduleRetry();
      return;
    }

    ws.onopen = () => {
      if (closed) return;
      setStatus("connected");
      try {
        ws?.send(JSON.stringify({ type: "hello", role: "canvas", ...(hello ?? {}) }));
      } catch {}
      handlers.onHello?.();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as BridgeMessage;
        if (msg.type === "apply") handlers.onApply?.(msg.design);
        else if (msg.type === "command") handlers.onCommand?.(msg.command);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      ws = null;
      if (closed) {
        setStatus("idle");
        return;
      }
      setStatus("disconnected");
      scheduleRetry();
    };

    ws.onerror = () => {
      try {
        ws?.close();
      } catch {}
    };
  };

  const scheduleRetry = () => {
    if (closed || retry) return;
    retry = setTimeout(() => {
      retry = null;
      open();
    }, 2000);
  };

  open();

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    try {
      ws?.close();
    } catch {}
    ws = null;
    setStatus("idle");
  };
}
