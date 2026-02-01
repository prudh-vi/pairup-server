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

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }, // Added backup STUN
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:global.relay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10, // Generate candidates more eagerly
};

const VideoChatApp = () => {
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null); // Keep track of stream

  const [appState, setAppState] = useState<"idle" | "searching" | "connected">("idle");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const cleanupConnection = useCallback(() => {
    console.log("Cleaning up connection...");

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    // Don't stop local stream when just switching partners
    if (remoteVideoRef.current) {
      const remoteStream = remoteVideoRef.current.srcObject as MediaStream;
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
      }
      remoteVideoRef.current.srcObject = null;
    }

    setRoomId("");
    setMessages([]);
    setMessage("");
  }, []);

  const stopLocalStream = useCallback(() => {
    console.log("Stopping local stream...");
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const setupPeerConnection = useCallback((socket: Socket, roomId: string, stream: MediaStream, role: string) => {
    console.log(`Setting up peer connection as ${role} for room ${roomId}`);
    
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    // Add local tracks
    stream.getTracks().forEach(track => {
      console.log(`Adding ${track.kind} track to peer connection`);
      peer.addTrack(track, stream);
    });

    // Handle incoming remote stream
    peer.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates - SINGLE HANDLER
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate.type);
        socket.emit("webrtc:ice", {
          roomId,
          candidate: event.candidate,
        });
      } else {
        console.log("All ICE candidates have been sent");
      }
    };

    // Monitor connection state
    peer.onconnectionstatechange = () => {
      console.log("Connection state:", peer.connectionState);
      if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
        console.error("Peer connection failed/disconnected");
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", peer.iceConnectionState);
    };

    return peer;
  }, []);

  const handleMatched = useCallback(async (socket: Socket, { roomId, role }: { roomId: string; role: string }) => {
    console.log(`Matched! Room: ${roomId}, Role: ${role}`);
    
    setRoomId(roomId);
    setAppState("connected");

    try {
      // Get or reuse local stream
      let stream = localStreamRef.current;
      
      if (!stream) {
        console.log("Requesting media access...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      // Setup peer connection
      const peer = setupPeerConnection(socket, roomId, stream, role);

      // If caller, create and send offer
      if (role === "caller") {
        console.log("Creating offer as caller...");
        const offer = await peer.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });
        await peer.setLocalDescription(offer);
        
        console.log("Sending offer to server");
        socket.emit("webrtc:offer", {
          roomId,
          offer,
        });
      }
    } catch (error) {
      console.error("Error in handleMatched:", error);
      alert("Failed to access camera/microphone. Please check permissions.");
      setAppState("idle");
    }
  }, [setupPeerConnection]);

  const startChat = useCallback(() => {
    if (socketRef.current) {
      console.log("Reusing existing socket connection");
      socketRef.current.emit("client:start_chat");
      setAppState("searching");
      return;
    }

    console.log("Starting new chat session...");
    setAppState("searching");

    const socket = io("https://backxpairup.zrxprudhvi.tech", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to backend:", socket.id);
      socket.emit("client:start_chat");
    });

    socket.on("server:welcome", (data) => {
      console.log("Server says:", data.message);
    });

    socket.on("server:matched", (data) => {
      handleMatched(socket, data);
    });

    socket.on("webrtc:offer", async ({ offer, roomId }) => {
      console.log("Received offer from peer");
      
      if (!peerRef.current) {
        console.error("No peer connection available to handle offer");
        return;
      }

      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Set remote description (offer)");
        
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        console.log("Created and set local description (answer)");
        
        socket.emit("webrtc:answer", {
          roomId,
          answer,
        });
        console.log("Sent answer to server");
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      console.log("Received answer from peer");
      
      if (!peerRef.current) {
        console.error("No peer connection available");
        return;
      }

      if (peerRef.current.signalingState !== "have-local-offer") {
        console.warn("Unexpected signaling state:", peerRef.current.signalingState);
        return;
      }

      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("Set remote description (answer)");
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    });

    socket.on("webrtc:ice", async ({ candidate }) => {
      console.log("Received ICE candidate");
      
      if (!peerRef.current) {
        console.error("No peer connection available for ICE candidate");
        return;
      }

      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Added ICE candidate successfully");
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    socket.on("server:new_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("server:partner_left", () => {
      console.log("Partner left, finding new match...");
      cleanupConnection();
      setAppState("searching");
      socket.emit("client:start_chat");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }, [handleMatched, cleanupConnection]);

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

    console.log("Skipping to next person...");
    cleanupConnection();
    socketRef.current.emit("client:skip", { roomId });
    setAppState("searching");
    socketRef.current.emit("client:start_chat");
  }, [roomId, cleanupConnection]);

  const endChat = useCallback(() => {
    if (!socketRef.current) return;

    console.log("Ending chat session...");
    cleanupConnection();
    stopLocalStream();
    
    if (roomId) {
      socketRef.current.emit("client:skip", { roomId });
    }
    
    socketRef.current.disconnect();
    socketRef.current = null;
    setAppState("idle");
  }, [roomId, cleanupConnection, stopLocalStream]);

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
        <div className="flex-1 flex flex-col lg:flex-row gap-4">
          {/* Side-by-side Videos (stacked on mobile) */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4">
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

          {/* Slim Chat Sidebar (full width on mobile, fixed width on desktop) */}
          <div className="w-full lg:w-72 flex flex-col">
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