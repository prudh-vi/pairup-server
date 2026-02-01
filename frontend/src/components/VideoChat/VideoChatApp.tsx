import { useRef, useState, useCallback, useEffect } from "react";
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
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
      ]
    },
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "87e969d8c4c0b3eb6ec2839b",
      credential: "I+6JKdamascPTKEZ",
    },
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "87e969d8c4c0b3eb6ec2839b",
      credential: "I+6JKdamascPTKEZ",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "87e969d8c4c0b3eb6ec2839b",
      credential: "I+6JKdamascPTKEZ",
    },
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: "87e969d8c4c0b3eb6ec2839b",
      credential: "I+6JKdamascPTKEZ",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const VideoChatApp = () => {
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const hasRelayCandidate = useRef(false);

  const [appState, setAppState] = useState<"idle" | "searching" | "connected">("idle");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const cleanupConnection = useCallback(() => {
    console.log("🧹 Cleaning up connection...");

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    pendingCandidatesRef.current = [];
    hasRelayCandidate.current = false;

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
    console.log("🛑 Stopping local stream...");
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const createPeerConnection = useCallback((socket: Socket, currentRoomId: string) => {
    console.log("🔧 Creating peer connection RIGHT NOW (synchronous)");
    
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    // Set up all handlers immediately
    peer.ontrack = (event) => {
      console.log(`🎥 Received remote ${event.track.kind} track (state: ${event.track.readyState})`);
      
      if (remoteVideoRef.current && event.streams[0]) {
        console.log("📺 Setting remote stream to video element");
        const remoteStream = event.streams[0];
        remoteVideoRef.current.srcObject = remoteStream;
        
        remoteVideoRef.current.play().catch(err => {
          console.error("Error auto-playing:", err);
          remoteVideoRef.current!.onclick = () => remoteVideoRef.current!.play();
        });

        console.log("Remote stream tracks:", remoteStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        })));
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        const c = event.candidate;
        console.log(`📡 ICE: ${c.type} | ${c.protocol}`);
        
        if (c.type === 'relay') {
          hasRelayCandidate.current = true;
          console.log("✅ TURN working!");
        }
        
        socket.emit("webrtc:ice", {
          roomId: currentRoomId,
          candidate: event.candidate,
        });
      } else {
        console.log("🏁 ICE complete");
        if (!hasRelayCandidate.current) {
          console.warn("⚠️ No TURN candidates");
        }
      }
    };

    peer.onconnectionstatechange = () => {
      console.log(`🔌 Connection: ${peer.connectionState}`);
      if (peer.connectionState === "connected") {
        console.log("✅✅✅ CONNECTED!");
      } else if (peer.connectionState === "failed") {
        console.error("❌ FAILED");
        peer.restartIce?.();
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE: ${peer.iceConnectionState}`);
    };

    peer.onicegatheringstatechange = () => {
      console.log(`🔍 Gathering: ${peer.iceGatheringState}`);
    };

    peer.onsignalingstatechange = () => {
      console.log(`📶 Signaling: ${peer.signalingState}`);
    };

    return peer;
  }, []);

  const handleMatched = useCallback(async (socket: Socket, { roomId, role }: { roomId: string; role: string }) => {
    console.log(`\n${'='.repeat(60)}\n🎯 MATCHED! Room: ${roomId} | Role: ${role}\n${'='.repeat(60)}\n`);
    
    setRoomId(roomId);
    setAppState("connected");

    // STEP 1: Create peer connection IMMEDIATELY (before any await)
    const peer = createPeerConnection(socket, roomId);

    // STEP 2: Now get media (async, but peer already exists)
    try {
      let stream = localStreamRef.current;
      
      if (!stream) {
        console.log("🎤 Getting media...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        
        console.log("✅ Media OK");
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
        }
      }

      // STEP 3: Add tracks to peer
      stream.getTracks().forEach(track => {
        console.log(`➕ Adding ${track.kind} track`);
        peer.addTrack(track, stream);
      });

      // STEP 4: Process queued candidates
      if (pendingCandidatesRef.current.length > 0) {
        console.log(`📦 Processing ${pendingCandidatesRef.current.length} queued candidates`);
        for (const candidate of pendingCandidatesRef.current) {
          try {
            if (peer.remoteDescription) {
              await peer.addIceCandidate(candidate);
              console.log("✅ Added queued candidate");
            }
          } catch (err) {
            console.error("Error with queued candidate:", err);
          }
        }
        pendingCandidatesRef.current = [];
      }

      // STEP 5: If caller, create offer
      if (role === "caller") {
        console.log("📞 Creating offer...");
        const offer = await peer.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });
        
        await peer.setLocalDescription(offer);
        console.log("📤 Sending offer");
        
        socket.emit("webrtc:offer", { roomId, offer });
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Camera/mic failed. Please allow access and refresh.");
      setAppState("idle");
    }
  }, [createPeerConnection]);

  const startChat = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log("♻️ Reusing socket");
      socketRef.current.emit("client:start_chat");
      setAppState("searching");
      return;
    }

    console.log("🚀 Starting chat...");
    setAppState("searching");

    const socket = io("https://backxpairup.zrxprudhvi.tech", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`✅ Connected: ${socket.id}`);
      socket.emit("client:start_chat");
    });

    socket.on("server:welcome", (data) => {
      console.log("👋", data.message);
    });

    socket.on("server:matched", (data) => {
      handleMatched(socket, data);
    });

    socket.on("webrtc:offer", async ({ offer, roomId }) => {
      console.log("📥 Got offer");
      
      const peer = peerRef.current;
      if (!peer) {
        console.error("❌ No peer! This should never happen now!");
        return;
      }

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("✅ Remote description set");
        
        // Process queued candidates
        if (pendingCandidatesRef.current.length > 0) {
          console.log(`📦 Processing ${pendingCandidatesRef.current.length} queued candidates`);
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await peer.addIceCandidate(candidate);
              console.log("✅ Added queued candidate");
            } catch (err) {
              console.error("Error:", err);
            }
          }
          pendingCandidatesRef.current = [];
        }
        
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        console.log("📤 Sending answer");
        
        socket.emit("webrtc:answer", { roomId, answer });
      } catch (error) {
        console.error("❌ Offer error:", error);
      }
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      console.log("📥 Got answer");
      
      const peer = peerRef.current;
      if (!peer) return;

      if (peer.signalingState !== "have-local-offer") {
        console.warn(`⚠️ Wrong state: ${peer.signalingState}`);
        return;
      }

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Remote description set");
        
        // Process queued candidates
        if (pendingCandidatesRef.current.length > 0) {
          console.log(`📦 Processing ${pendingCandidatesRef.current.length} queued`);
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await peer.addIceCandidate(candidate);
            } catch (err) {
              console.error("Error:", err);
            }
          }
          pendingCandidatesRef.current = [];
        }
      } catch (error) {
        console.error("❌ Answer error:", error);
      }
    });

    socket.on("webrtc:ice", async ({ candidate }) => {
      console.log("📥 Got ICE");
      
      const peer = peerRef.current;
      if (!peer) {
        console.log("⏳ Queuing (no peer)");
        pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        return;
      }

      if (!peer.remoteDescription) {
        console.log("⏳ Queuing (no remote desc)");
        pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        return;
      }

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ Added ICE");
      } catch (error) {
        console.error("❌ ICE error:", error);
      }
    });

    socket.on("server:new_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("server:partner_left", () => {
      console.log("👋 Partner left");
      cleanupConnection();
      setAppState("searching");
      socket.emit("client:start_chat");
    });

    socket.on("disconnect", () => console.log("❌ Disconnected"));
    socket.on("connect_error", (err) => console.error("❌ Error:", err));
  }, [handleMatched, cleanupConnection]);

  const sendMessage = useCallback(() => {
    if (!socketRef.current || !roomId || !message.trim()) return;
    socketRef.current.emit("client:send_message", { roomId, message: message.trim() });
    setMessage("");
  }, [roomId, message]);

  const skipChat = useCallback(() => {
    if (!socketRef.current || !roomId) return;
    console.log("⏭️ Skipping...");
    cleanupConnection();
    socketRef.current.emit("client:skip", { roomId });
    setAppState("searching");
    socketRef.current.emit("client:start_chat");
  }, [roomId, cleanupConnection]);

  const endChat = useCallback(() => {
    if (!socketRef.current) return;
    console.log("🛑 Ending...");
    cleanupConnection();
    stopLocalStream();
    if (roomId) socketRef.current.emit("client:skip", { roomId });
    socketRef.current.disconnect();
    socketRef.current = null;
    setAppState("idle");
  }, [roomId, cleanupConnection, stopLocalStream]);

  // Monitor remote video
  useEffect(() => {
    if (appState !== "connected") return;
    
    const interval = setInterval(() => {
      const remote = remoteVideoRef.current;
      if (remote?.srcObject) {
        const stream = remote.srcObject as MediaStream;
        const videoTrack = stream.getVideoTracks()[0];
        console.log("📊 Remote video:", {
          width: remote.videoWidth,
          height: remote.videoHeight,
          trackState: videoTrack?.readyState,
          paused: remote.paused,
        });
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [appState]);

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
      <header className="flex items-center justify-between p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl gradient-fire flex items-center justify-center">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-fire-text">PairUp</span>
        </div>
        <StatusIndicator {...getStatusConfig()} />
      </header>

      <main className="flex-1 p-4 lg:p-6 pt-0 flex flex-col">
        <div className="flex-1 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <VideoPanel ref={localVideoRef} isActive={true} label="You" />
            </div>
            <div className="flex-1">
              <VideoPanel
                ref={remoteVideoRef}
                isActive={appState === "connected"}
                label="Stranger"
              />
            </div>
          </div>

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

        <AnimatePresence>
          {(appState === "searching" || appState === "connected") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-center gap-4 mt-4"
            >
              <ActionButton icon={PhoneOff} label="End Call" variant="danger" onClick={endChat} />
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