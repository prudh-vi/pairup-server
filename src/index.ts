import { createServer } from "http";
import { Server } from "socket.io";
import { Hono } from "hono";
import {
  registry,
  activeConnections,
  totalMatches,
  usersInQueue,
  skipCounter,
  matchDuration,
} from "./metrics.js";

const PORT = Number(process.env.PORT) || 3000;
const METRICS_TOKEN = process.env.METRICS_TOKEN ?? "";

// ─── Hono HTTP app ─────────────────────────────────────────────────────────────

const app = new Hono();

app.get("/", (c) => c.text("PairUp Backend Running"));

app.get("/metrics", async (c) => {
  const auth = c.req.header("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!METRICS_TOKEN || token !== METRICS_TOKEN) {
    return c.text("Forbidden", 403);
  }

  return c.body(await registry.metrics(), 200, {
    "Content-Type": registry.contentType,
  });
});

// ─── HTTP server shared with Socket.IO ────────────────────────────────────────

const httpServer = createServer();

// Route non-socket.io HTTP requests through Hono
httpServer.on("request", async (req, res) => {
  if (req.url?.startsWith("/socket.io")) return;

  const url = new URL(req.url ?? "/", "http://localhost");
  const request = new Request(url.toString(), {
    method: req.method ?? "GET",
    headers: req.headers as HeadersInit,
  });

  try {
    const response = await app.fetch(request);
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      headers[k] = v;
    });
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket"],
});

// ─── Queue & match tracking ───────────────────────────────────────────────────

const waitingUsers: string[] = [];
const socketsInQueue = new Set<string>();
const activeRooms = new Set<string>();
const socketToRoom = new Map<string, string>();
const matchStartTimes = new Map<string, number>();

const addToQueue = (socketId: string) => {
  waitingUsers.push(socketId);
  if (!socketsInQueue.has(socketId)) {
    socketsInQueue.add(socketId);
    usersInQueue.inc();
  }
};

const removeFromQueue = (socketId: string) => {
  const index = waitingUsers.indexOf(socketId);
  if (index !== -1) {
    waitingUsers.splice(index, 1);
    socketsInQueue.delete(socketId);
    usersInQueue.dec();
  }
};

// Dequeue the first waiting user and decrement the gauge.
const dequeueFirst = (): string | undefined => {
  if (waitingUsers.length === 0) return undefined;
  const socketId = waitingUsers.shift()!;
  socketsInQueue.delete(socketId);
  usersInQueue.dec();
  return socketId;
};

const endMatchForRoom = (roomId: string) => {
  if (!activeRooms.has(roomId)) return;
  activeRooms.delete(roomId);
  activeConnections.dec();

  const start = matchStartTimes.get(roomId);
  if (start !== undefined) {
    matchDuration.observe((Date.now() - start) / 1000);
    matchStartTimes.delete(roomId);
  }
};

// ─── Socket events ────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.emit("server:welcome", {
    message: "Connected to PairUp realtime server",
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);

    // End active match if this socket was in one
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      endMatchForRoom(roomId);
      socketToRoom.delete(socket.id);
      socket.to(roomId).emit("server:partner_left");
    }

    removeFromQueue(socket.id);
  });

  socket.on("client:start_chat", () => {
    console.log("🔍 User wants chat:", socket.id);

    // Guard: remove from queue if somehow already queued
    removeFromQueue(socket.id);

    const partnerId = dequeueFirst(); // match-found → usersInQueue.dec() via dequeueFirst

    if (partnerId && partnerId !== socket.id) {
      const partnerSocket = io.sockets.sockets.get(partnerId);

      if (!partnerSocket) {
        console.log("⚠️ Partner socket missing");
        addToQueue(socket.id);
        return;
      }

      const roomId = `room_${socket.id}_${partnerId}`;
      socket.join(roomId);
      partnerSocket.join(roomId);

      socket.emit("server:matched", { roomId, role: "caller" });
      partnerSocket.emit("server:matched", { roomId, role: "receiver" });

      // match-found metrics
      activeRooms.add(roomId);
      socketToRoom.set(socket.id, roomId);
      socketToRoom.set(partnerId, roomId);
      matchStartTimes.set(roomId, Date.now());
      activeConnections.inc();
      totalMatches.inc();

      console.log(`🔥 Matched ${socket.id} <-> ${partnerId}`);
    } else {
      // No valid partner — put self (and any mis-dequeued partnerId) back
      if (partnerId && partnerId === socket.id) {
        // edge case: dequeued self
      }
      addToQueue(socket.id);
      console.log("🕒 Added to queue:", socket.id);
    }
  });

  socket.on("client:send_message", ({ roomId, message }) => {
    io.to(roomId).emit("server:new_message", {
      sender: socket.id,
      message,
    });
  });

  socket.on("client:skip", ({ roomId }) => {
    console.log("⏭️ User skipped:", socket.id);

    skipCounter.inc();
    endMatchForRoom(roomId);
    socketToRoom.delete(socket.id);

    socket.leave(roomId);
    socket.to(roomId).emit("server:partner_left");

    // Re-enter queue after skip
    removeFromQueue(socket.id);
    addToQueue(socket.id);
  });

  // ── WebRTC signaling ─────────────────────────────────────────────────────────

  socket.on("webrtc:offer", ({ roomId, offer }) => {
    console.log("📤 OFFER from", socket.id);
    socket.to(roomId).emit("webrtc:offer", { offer, roomId });
  });

  socket.on("webrtc:answer", ({ roomId, answer }) => {
    console.log("📤 ANSWER from", socket.id);
    socket.to(roomId).emit("webrtc:answer", { answer });
  });

  socket.on("webrtc:ice", ({ roomId, candidate }) => {
    console.log(`🧊 ICE from ${socket.id} => ${candidate?.type || "unknown"}`);
    socket.to(roomId).emit("webrtc:ice", { candidate });
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
