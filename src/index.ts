import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 4000;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PairUp Backend Running");
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
  transports: ["websocket"],
});

const waitingUsers: string[] = [];

const removeFromQueue = (socketId: string) => {
  const index = waitingUsers.indexOf(socketId);

  if (index !== -1) {
    waitingUsers.splice(index, 1);
  }
};

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.emit("server:welcome", {
    message: "Connected to PairUp realtime server",
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);

    removeFromQueue(socket.id);

    // notify all rooms this user was part of
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("server:partner_left");
      }
    });
  });

  socket.on("client:start_chat", () => {
    console.log("🔍 User wants chat:", socket.id);

    removeFromQueue(socket.id);

    if (waitingUsers.length > 0) {
      const partnerId = waitingUsers.shift();

      if (!partnerId || partnerId === socket.id) {
        waitingUsers.push(socket.id);
        return;
      }

      const roomId = `room_${socket.id}_${partnerId}`;

      socket.join(roomId);

      const partnerSocket = io.sockets.sockets.get(partnerId);

      if (!partnerSocket) {
        console.log("⚠️ Partner socket missing");
        waitingUsers.push(socket.id);
        return;
      }

      partnerSocket.join(roomId);

      socket.emit("server:matched", {
        roomId,
        role: "caller",
      });

      partnerSocket.emit("server:matched", {
        roomId,
        role: "receiver",
      });

      console.log(`🔥 Matched ${socket.id} <-> ${partnerId}`);
    } else {
      waitingUsers.push(socket.id);

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

    socket.leave(roomId);

    socket.to(roomId).emit("server:partner_left");

    removeFromQueue(socket.id);

    waitingUsers.push(socket.id);
  });

  // =========================
  // WEBRTC SIGNALING
  // =========================

  socket.on("webrtc:offer", ({ roomId, offer }) => {
    console.log("📤 OFFER from", socket.id);

    socket.to(roomId).emit("webrtc:offer", {
      offer,
      roomId,
    });
  });

  socket.on("webrtc:answer", ({ roomId, answer }) => {
    console.log("📤 ANSWER from", socket.id);

    socket.to(roomId).emit("webrtc:answer", {
      answer,
    });
  });

  socket.on("webrtc:ice", ({ roomId, candidate }) => {
    console.log(
      `🧊 ICE from ${socket.id} => ${candidate?.type || "unknown"}`
    );

    socket.to(roomId).emit("webrtc:ice", {
      candidate,
    });
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});