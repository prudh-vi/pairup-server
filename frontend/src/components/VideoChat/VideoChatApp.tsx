import { useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, PhoneOff, Flame } from "lucide-react";

import VideoPanel from "./VideoPanel";
import ChatPanel from "./ChatPanel";
import StatusIndicator from "./StatusIndicator";
import ActionButton from "./ActionButton";
import StartScreen from "./StartScreen";

interface Message {
  sender: string;
  message: string;
}

const VideoChatApp = () => {
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const [appState, setAppState] = useState<"idle" | "searching" | "connected">("idle");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const cleanupConnection = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    const localStream = localVideoRef.current?.srcObject as MediaStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setRoomId("");
    setMessages([]);
    setMessage("");
  }, []);

  const startChat = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("client:start_chat");
      setAppState("searching");
      return;
    }

    console.log("START CHAT button clicked");
    setAppState("searching");

    const socket = io("http://34.14.132.4:4000/", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("connected to backend", socket.id);
      socket.emit("client:start_chat");
    });

    socket.on("server:welcome", (data) => {
      console.log("server says", data.message);
    });

    socket.on("server:matched", async ({ roomId, role }) => {
      console.log("MATCH EVENT:", roomId, role);

      setRoomId(roomId);
      setAppState("connected");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      peer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc:ice", {
            roomId,
            candidate: event.candidate,
          });
        }
      };

      if (role === "caller") {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit("webrtc:offer", {
          roomId,
          offer,
        });
      }
    });

    socket.on("webrtc:offer", async ({ offer, roomId }) => {
      console.log("Received offer");

      if (!peerRef.current) return;

      await peerRef.current.setRemoteDescription(offer);

      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);

      socket.emit("webrtc:answer", {
        roomId,
        answer,
      });
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      console.log("Received answer");

      if (!peerRef.current) return;

      if (peerRef.current.signalingState !== "have-local-offer") return;

      await peerRef.current.setRemoteDescription(answer);
    });

    socket.on("webrtc:ice", async ({ candidate }) => {
      if (!peerRef.current) return;

      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.log("error", err);
      }
    });

    socket.on("server:new_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("server:partner_left", () => {
      cleanupConnection();
      setAppState("searching");
      socket.emit("client:start_chat");
    });
  }, [cleanupConnection]);

  const sendMessage = useCallback(() => {
    if (!socketRef.current || !roomId || !message.trim()) return;

    socketRef.current.emit("client:send_message", {
      roomId,
      message: message.trim(),
    });

    setMessage("");
  }, [roomId, message]);

  const skipChat = useCallback(() => {
    if (!socketRef.current || !roomId) return;

    cleanupConnection();
    socketRef.current.emit("client:skip", { roomId });
    setAppState("searching");
    socketRef.current.emit("client:start_chat");
  }, [roomId, cleanupConnection]);

  const endChat = useCallback(() => {
    if (!socketRef.current) return;

    cleanupConnection();
    
    if (roomId) {
      socketRef.current.emit("client:skip", { roomId });
    }
    
    socketRef.current.disconnect();
    socketRef.current = null;
    setAppState("idle");
  }, [roomId, cleanupConnection]);

  const getStatusConfig = () => {
    switch (appState) {
      case "idle":
        return { status: "idle" as const, message: "Ready to connect" };
      case "searching":
        return { status: "searching" as const, message: "Finding someone awesome..." };
      case "connected":
        return { status: "connected" as const, message: "You're connected!" };
    }
  };

  if (appState === "idle") {
    return <StartScreen onStart={startChat} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl gradient-fire flex items-center justify-center">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-fire-text">PairUp</span>
        </div>
        <StatusIndicator {...getStatusConfig()} />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 pt-0 flex flex-col">
        <div className="flex-1 flex gap-4">
          {/* Side-by-side Videos */}
          <div className="flex-1 flex gap-4">
            {/* Local Video (You) */}
            <div className="flex-1">
              <VideoPanel
                ref={localVideoRef}
                isActive={true}
                label="You"
              />
            </div>
            
            {/* Remote Video (Stranger) */}
            <div className="flex-1">
              <VideoPanel
                ref={remoteVideoRef}
                isActive={appState === "connected"}
                label="Stranger"
              />
            </div>
          </div>

          {/* Slim Chat Sidebar */}
          <div className="w-72 flex flex-col">
            <ChatPanel
              messages={messages}
              currentUserId={socketRef.current?.id}
              inputValue={message}
              onInputChange={setMessage}
              onSend={sendMessage}
              isConnected={appState === "connected"}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {(appState === "searching" || appState === "connected") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-center gap-4 mt-4"
            >
              <ActionButton
                icon={PhoneOff}
                label="End Call"
                variant="danger"
                onClick={endChat}
              />
              <ActionButton
                icon={SkipForward}
                label="Next Person"
                variant="primary"
                size="lg"
                onClick={skipChat}
                disabled={appState !== "connected"}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VideoChatApp;
