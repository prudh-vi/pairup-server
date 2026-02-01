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

// Updated TURN servers with better reliability
const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Multiple STUN servers for redundancy
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    
    // Free TURN servers - try multiple for better reliability
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    
    // Backup TURN servers
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efKCVY0K5YH0WA3W9Q",
      credential: "6Htttbs1hXqj3dEu",
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Try all connection types (relay + direct)
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const VideoChatApp = () => {
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]); // Queue for early ICE candidates

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

    // Clear pending candidates
    pendingCandidatesRef.current = [];

    // Clean up remote stream
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
      const sender = peer.addTrack(track, stream);
      console.log(`Track added, sender:`, sender);
    });

    // Handle incoming remote stream
    peer.ontrack = (event) => {
      console.log(`🎥 Received remote track: ${event.track.kind}`, event.track);
      console.log("Remote track state:", event.track.readyState);
      console.log("Remote streams:", event.streams.length);
      
      if (remoteVideoRef.current && event.streams[0]) {
        console.log("Setting remote stream to video element");
        remoteVideoRef.current.srcObject = event.streams[0];
        
        // Force play after a short delay
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.play().catch(err => {
              console.error("Error playing remote video:", err);
            });
          }
        }, 100);
      }
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`📡 Sending ICE candidate: ${event.candidate.type} (${event.candidate.protocol})`);
        console.log("Candidate details:", {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
          priority: event.candidate.priority,
        });
        
        socket.emit("webrtc:ice", {
          roomId,
          candidate: event.candidate,
        });
      } else {
        console.log("✅ All ICE candidates have been sent");
      }
    };

    // Detailed connection state monitoring
    peer.onconnectionstatechange = () => {
      console.log(`🔌 Connection state: ${peer.connectionState}`);
      
      if (peer.connectionState === "connected") {
        console.log("✅ PEER CONNECTION ESTABLISHED!");
      } else if (peer.connectionState === "failed") {
        console.error("❌ Peer connection FAILED");
        console.log("Attempting ICE restart...");
        
        // Try to restart ICE
        if (peer.restartIce) {
          peer.restartIce();
        }
      } else if (peer.connectionState === "disconnected") {
        console.warn("⚠️ Peer connection disconnected");
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${peer.iceConnectionState}`);
      
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") {
        console.log("✅ ICE CONNECTION ESTABLISHED!");
      } else if (peer.iceConnectionState === "failed") {
        console.error("❌ ICE connection FAILED - likely NAT/firewall issue");
      } else if (peer.iceConnectionState === "disconnected") {
        console.warn("⚠️ ICE connection disconnected");
      }
    };

    peer.onicegatheringstatechange = () => {
      console.log(`🔍 ICE gathering state: ${peer.iceGatheringState}`);
    };

    peer.onsignalingstatechange = () => {
      console.log(`📶 Signaling state: ${peer.signalingState}`);
    };

    // Add stats monitoring
    const statsInterval = setInterval(async () => {
      if (peer && peer.connectionState === "connected") {
        try {
          const stats = await peer.getStats();
          stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              console.log("Active candidate pair:", {
                local: report.localCandidateId,
                remote: report.remoteCandidateId,
                bytesReceived: report.bytesReceived,
                bytesSent: report.bytesSent,
              });
            }
          });
        } catch (err) {
          console.error("Error getting stats:", err);
        }
      }
    }, 5000);

    // Clean up interval when peer closes
    peer.addEventListener('connectionstatechange', () => {
      if (peer.connectionState === 'closed' || peer.connectionState === 'failed') {
        clearInterval(statsInterval);
      }
    });

    return peer;
  }, []);

  const handleMatched = useCallback(async (socket: Socket, { roomId, role }: { roomId: string; role: string }) => {
    console.log(`🎯 Matched! Room: ${roomId}, Role: ${role}`);
    
    setRoomId(roomId);
    setAppState("connected");

    try {
      // Get or reuse local stream
      let stream = localStreamRef.current;
      
      if (!stream) {
        console.log("🎤 Requesting media access...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        
        console.log("✅ Media access granted");
        console.log("Local stream tracks:", stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Mute local video to prevent echo
        }
      }

      // Setup peer connection
      const peer = setupPeerConnection(socket, roomId, stream, role);

      // Process any pending ICE candidates
      if (pendingCandidatesRef.current.length > 0) {
        console.log(`Processing ${pendingCandidatesRef.current.length} pending ICE candidates`);
        for (const candidate of pendingCandidatesRef.current) {
          try {
            await peer.addIceCandidate(candidate);
          } catch (err) {
            console.error("Error adding pending ICE candidate:", err);
          }
        }
        pendingCandidatesRef.current = [];
      }

      // If caller, create and send offer
      if (role === "caller") {
        console.log("📞 Creating offer as caller...");
        const offer = await peer.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });
        
        console.log("Offer SDP:", offer.sdp?.substring(0, 200) + "...");
        await peer.setLocalDescription(offer);
        
        console.log("📤 Sending offer to server");
        socket.emit("webrtc:offer", {
          roomId,
          offer,
        });
      }
    } catch (error) {
      console.error("❌ Error in handleMatched:", error);
      alert("Failed to access camera/microphone. Please check permissions and try again.");
      setAppState("idle");
    }
  }, [setupPeerConnection]);

  const startChat = useCallback(() => {
    if (socketRef.current) {
      console.log("♻️ Reusing existing socket connection");
      socketRef.current.emit("client:start_chat");
      setAppState("searching");
      return;
    }

    console.log("🚀 Starting new chat session...");
    setAppState("searching");

    const socket = io("https://backxpairup.zrxprudhvi.tech", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to backend:", socket.id);
      socket.emit("client:start_chat");
    });

    socket.on("server:welcome", (data) => {
      console.log("👋 Server says:", data.message);
    });

    socket.on("server:matched", (data) => {
      handleMatched(socket, data);
    });

    socket.on("webrtc:offer", async ({ offer, roomId }) => {
      console.log("📥 Received offer from peer");
      
      if (!peerRef.current) {
        console.error("❌ No peer connection available to handle offer");
        return;
      }

      try {
        console.log("Setting remote description (offer)...");
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("✅ Set remote description (offer)");
        
        console.log("Creating answer...");
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        console.log("✅ Created and set local description (answer)");
        
        console.log("📤 Sending answer to server");
        socket.emit("webrtc:answer", {
          roomId,
          answer,
        });
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      console.log("📥 Received answer from peer");
      
      if (!peerRef.current) {
        console.error("❌ No peer connection available");
        return;
      }

      if (peerRef.current.signalingState !== "have-local-offer") {
        console.warn(`⚠️ Unexpected signaling state: ${peerRef.current.signalingState}`);
        return;
      }

      try {
        console.log("Setting remote description (answer)...");
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Set remote description (answer)");
      } catch (error) {
        console.error("❌ Error handling answer:", error);
      }
    });

    socket.on("webrtc:ice", async ({ candidate }) => {
      console.log("📥 Received ICE candidate from peer");
      
      if (!peerRef.current) {
        console.warn("⚠️ No peer connection yet, queuing ICE candidate");
        pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        return;
      }

      // Check if remote description is set
      if (!peerRef.current.remoteDescription) {
        console.warn("⚠️ Remote description not set yet, queuing ICE candidate");
        pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        return;
      }

      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ Added ICE candidate successfully");
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    });

    socket.on("server:new_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("server:partner_left", () => {
      console.log("👋 Partner left, finding new match...");
      cleanupConnection();
      setAppState("searching");
      socket.emit("client:start_chat");
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
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

    console.log("⏭️ Skipping to next person...");
    cleanupConnection();
    socketRef.current.emit("client:skip", { roomId });
    setAppState("searching");
    socketRef.current.emit("client:start_chat");
  }, [roomId, cleanupConnection]);

  const endChat = useCallback(() => {
    if (!socketRef.current) return;

    console.log("🛑 Ending chat session...");
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