const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Periodically check connection health (e.g., every 30 seconds)
const PING_INTERVAL = 30000;

wss.on('connection', function connection(ws) {
// Mark the connection as alive when it's first established
ws.isAlive = true;

// Listen for the built-in 'pong' event to reset the alive status
ws.on('pong', function heartbeat() {
ws.isAlive = true;
});

ws.on('message', function incoming(message) {
console.log('received: %s', message);
});

ws.on('close', function close() {
console.log('Client disconnected');
});
});

// Set up the interval to send pings and check for timeouts
const interval = setInterval(function ping() {
wss.clients.forEach(function each(ws) {
if (ws.isAlive === false) {
// If the client didn't respond to the last ping, terminate the connection
console.log('Client did not respond, terminating connection');
return ws.terminate();
}

    // Mark the connection as potentially dead and send a ping
    ws.isAlive = false;
    ws.ping(); // Use the built-in ping method

});
}, PING_INTERVAL);

wss.on('close', function close() {
clearInterval(interval);
});

https://share.google/aimode/zEY0cu48YiJHpqWNi

---

// ============================================================
// ReconnectingWebSocket.ts
// Pure TypeScript — zero React dependency
// Wraps native WebSocket with:
// - Exponential backoff + jitter
// - JWT refresh before each reconnect
// - Visibility API integration (mobile-safe)
// - Client-side JSON ping/pong (proxy-safe)
// - Clean typed event emitter interface
// ============================================================

export type ConnectionStatus =
| "connecting"
| "connected"
| "reconnecting"
| "disconnected";

export type WSMessage = {
type: string;
[key: string]: unknown;
};

type EventMap = {
message: (data: WSMessage) => void;
statusChange: (status: ConnectionStatus) => void;
maxRetriesReached: () => void;
};

type Listeners = {
[K in keyof EventMap]: Set<EventMap[K]>;
};

interface ReconnectingWSOptions {
/** Called before each (re)connect to get a fresh JWT \*/
getToken: () => Promise<string>;
/** WebSocket server base URL e.g. "wss://api.yourdomain.com/ws" _/
url: string;
maxRetries?: number;
baseDelay?: number; // ms, default 1000
maxDelay?: number; // ms, default 30000
/\*\* Client-side JSON ping interval in ms. Default 25000 _/
pingInterval?: number;
}

export class ReconnectingWebSocket {
private ws: WebSocket | null = null;
private status: ConnectionStatus = "disconnected";
private retryCount = 0;
private retryTimer: ReturnType<typeof setTimeout> | null = null;
private pingTimer: ReturnType<typeof setInterval> | null = null;
private pongTimeout: ReturnType<typeof setTimeout> | null = null;
private intentionallyClosed = false;

private readonly options: Required<ReconnectingWSOptions>;

private listeners: Listeners = {
message: new Set(),
statusChange: new Set(),
maxRetriesReached: new Set(),
};

constructor(options: ReconnectingWSOptions) {
this.options = {
maxRetries: 10,
baseDelay: 1000,
maxDelay: 30000,
pingInterval: 25000,
...options,
};

    // When tab becomes visible again, check if socket is dead
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

}

// ─── Public API ────────────────────────────────────────────

connect() {
this.intentionallyClosed = false;
this.retryCount = 0;
this.initiateConnection();
}

/\*_ Graceful close — will NOT trigger reconnection _/
disconnect() {
this.intentionallyClosed = true;
this.cleanup();
this.setStatus("disconnected");
}

send(message: WSMessage) {
if (this.ws?.readyState === WebSocket.OPEN) {
this.ws.send(JSON.stringify(message));
} else {
console.warn("[RWS] Tried to send while not connected:", message);
}
}

on<K extends keyof EventMap>(event: K, listener: EventMap[K]) {
(this.listeners[event] as Set<EventMap[K]>).add(listener);
return () => this.off(event, listener); // returns unsubscribe fn
}

off<K extends keyof EventMap>(event: K, listener: EventMap[K]) {
(this.listeners[event] as Set<EventMap[K]>).delete(listener);
}

getStatus() {
return this.status;
}

destroy() {
document.removeEventListener(
"visibilitychange",
this.handleVisibilityChange
);
this.disconnect();
}

// ─── Core Connection Logic ─────────────────────────────────

private async initiateConnection() {
this.setStatus(this.retryCount === 0 ? "connecting" : "reconnecting");

    let token: string;
    try {
      // Always fetch a fresh token — handles expiry on reconnect
      token = await this.options.getToken();
    } catch (err) {
      console.error("[RWS] Failed to get token:", err);
      this.scheduleReconnect();
      return;
    }

    const wsUrl = `${this.options.url}?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("[RWS] WebSocket construction failed:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = this.handleOpen;
    this.ws.onclose = this.handleClose;
    this.ws.onerror = this.handleError;
    this.ws.onmessage = this.handleMessage;

}

private handleOpen = () => {
console.log("[RWS] ✅ Connected");
this.retryCount = 0;
this.setStatus("connected");
this.startClientPing();
};

private handleClose = (event: CloseEvent) => {
console.log(`[RWS] 🔌 Closed (code: ${event.code})`);
this.stopClientPing();

    if (this.intentionallyClosed) return;

    // 1000 = normal closure, 1001 = going away (page navigation)
    // Still reconnect on these in case it wasn't intentional from our side
    this.scheduleReconnect();

};

private handleError = (event: Event) => {
console.error("[RWS] ❌ Error:", event);
// onclose will fire after onerror automatically — reconnect happens there
};

private handleMessage = (event: MessageEvent) => {
try {
const data: WSMessage = JSON.parse(event.data);

      // Handle server pong response to our client-side ping
      if (data.type === "pong") {
        this.clearPongTimeout();
        return;
      }

      this.emit("message", data);
    } catch {
      console.error("[RWS] Failed to parse message:", event.data);
    }

};

// ─── Reconnect with Exponential Backoff + Jitter ───────────

private scheduleReconnect() {
if (this.retryCount >= this.options.maxRetries) {
console.error("[RWS] Max retries reached. Giving up.");
this.setStatus("disconnected");
this.emit("maxRetriesReached");
return;
}

    // Exponential backoff: 1s, 2s, 4s, 8s... capped at maxDelay
    const exponential = Math.min(
      this.options.baseDelay * 2 ** this.retryCount,
      this.options.maxDelay
    );

    // Jitter: ±500ms so clients don't all reconnect simultaneously
    const jitter = (Math.random() - 0.5) * 1000;
    const delay = Math.max(0, exponential + jitter);

    console.log(
      `[RWS] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.retryCount + 1}/${this.options.maxRetries})`
    );

    this.retryTimer = setTimeout(() => {
      this.retryCount++;
      this.initiateConnection();
    }, delay);

}

// ─── Client-Side JSON Ping/Pong (proxy-safe) ───────────────
// Different from protocol-level ping — works through HTTP proxies
// that strip WebSocket ping frames

private startClientPing() {
this.stopClientPing();
this.pingTimer = setInterval(() => {
if (this.ws?.readyState === WebSocket.OPEN) {
this.ws.send(JSON.stringify({ type: "ping" }));

        // If no pong within 5s, connection is dead
        this.pongTimeout = setTimeout(() => {
          console.warn("[RWS] Pong timeout — terminating dead connection");
          this.ws?.close();
        }, 5000);
      }
    }, this.options.pingInterval);

}

private stopClientPing() {
if (this.pingTimer) clearInterval(this.pingTimer);
this.clearPongTimeout();
this.pingTimer = null;
}

private clearPongTimeout() {
if (this.pongTimeout) clearTimeout(this.pongTimeout);
this.pongTimeout = null;
}

// ─── Visibility API ────────────────────────────────────────

private handleVisibilityChange = () => {
if (document.visibilityState === "visible") {
const isDead =
!this.ws ||
this.ws.readyState === WebSocket.CLOSED ||
this.ws.readyState === WebSocket.CLOSING;

      if (isDead && !this.intentionallyClosed) {
        console.log("[RWS] Tab visible — reconnecting dead socket");
        this.retryCount = 0; // reset backoff for visibility-triggered reconnects
        this.initiateConnection();
      }
    }

};

// ─── Helpers ───────────────────────────────────────────────

private setStatus(status: ConnectionStatus) {
if (this.status === status) return;
this.status = status;
this.emit("statusChange", status);
}

private emit<K extends keyof EventMap>(
event: K,
...args: Parameters<EventMap[K]>
) {
(this.listeners[event] as Set<Function>).forEach((fn) => fn(...args));
}

private cleanup() {
if (this.retryTimer) clearTimeout(this.retryTimer);
this.stopClientPing();
this.ws?.close();
this.ws = null;
}
}
