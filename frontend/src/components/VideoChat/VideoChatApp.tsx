import { useRef, useState, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Flame, Loader2, Users, Pencil, SkipForward, PhoneOff } from "lucide-react";

import VideoTile from "./VideoTile";
import ChatPanel from "./ChatPanel";
import ControlBar from "./ControlBar";
import OnboardingDialog from "./OnboardingDialog";

const STORAGE_KEY = "pairup.profile.v1";

interface Profile {
  name: string;
  onboardedAt: string;
}

interface Message {
  sender: string;
  message: string;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: [
        "turn:40.81.245.227:3478?transport=udp",
        "turn:40.81.245.227:3478?transport=tcp",
      ],
      username: "pairup",
      credential: "securepassword123",
    },
  ],
};
const VideoChatApp = () => {
  // Logic Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const hasRelayCandidate = useRef(false);

  // Logic State
  const [appState, setAppState] = useState<"idle" | "searching" | "connected">("idle");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Mobile Chat State
  const [showMobileChatState, setShowMobileChatState] = useState(false);
  const showMobileChatRef = useRef(false);
  const [hasUnread, setHasUnread] = useState(false);

  const setShowMobileChat = useCallback((show: boolean) => {
    showMobileChatRef.current = show;
    setShowMobileChatState(show);
    if (show) setHasUnread(false);
  }, []);

  // UI Profile State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  // Handle Hydration
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  const handleComplete = (name: string) => {
    const next: Profile = { name, onboardedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setProfile(next);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    if (appState !== "idle") {
      endChat();
    }
  };

  // Logic Handlers
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
    setHasUnread(false);
    setShowMobileChat(false);
  }, [setShowMobileChat]);

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
        peer.addTrack(track, stream!);
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
      console.log("🔄 Reusing existing socket connection");
      socketRef.current.emit("client:start_chat");
      setAppState("searching");
      return;
    }

    console.log("🌐 Connecting to signaling server...");
    setAppState("searching");
    const socket = io("https://backxpairup.zrxprudhvi.tech", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected, requesting chat");
      socket.emit("client:start_chat");
    });

    socket.on("server:matched", (data) => {
      console.log("📢 Server:matched event received");
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
      if (!showMobileChatRef.current && window.innerWidth < 1024) {
        setHasUnread(true);
      }
    });

    socket.on("server:partner_left", () => {
      console.log("👤 Partner left");
      cleanupConnection();
      setAppState("searching");
      socket.emit("client:start_chat");
    });

    socket.on("disconnect", () => console.log("❌ Socket disconnected"));
    socket.on("connect_error", (error) => console.log("❌ Connection error:", error));
  }, [handleMatched, cleanupConnection]);

  const sendMessage = useCallback(() => {
    if (!socketRef.current || !roomId || !message.trim()) return;
    socketRef.current.emit("client:send_message", { roomId, message: message.trim() });
    setMessage("");
  }, [roomId, message]);

  const skipChat = useCallback(() => {
    if (!socketRef.current || !roomId) return;
    console.log("⏭️ Skipping chat");
    cleanupConnection();
    socketRef.current.emit("client:skip", { roomId });
    setAppState("searching");
    socketRef.current.emit("client:start_chat");
  }, [roomId, cleanupConnection]);

  const endChat = useCallback(() => {
    if (!socketRef.current) return;
    console.log("📞 Ending chat");
    cleanupConnection();
    stopLocalStream();
    if (roomId) socketRef.current.emit("client:skip", { roomId });
    socketRef.current.disconnect();
    socketRef.current = null;
    setAppState("idle");
  }, [roomId, cleanupConnection, stopLocalStream]);

  // Handle Mute/Cam
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !muted);
    }
  }, [muted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !camOff);
    }
  }, [camOff]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        skipChat();
      } else if (e.key.toLowerCase() === "m") {
        setMuted(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [skipChat]);

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

  const showOnboarding = hydrated && !profile;
  return (
    <main className={`min-h-screen bg-background text-foreground flex flex-col transition-all duration-500 ${appState !== 'idle' ? 'px-2 md:px-6 py-2 md:py-4 h-screen overflow-hidden' : 'px-4 md:px-8 py-6'}`}>
      {/* Hero header card — collapses when connected */}
      <header className={`brutal-card bg-lime transition-all duration-500 ease-in-out ${appState !== 'idle' ? 'px-6 py-3 mb-4' : 'px-6 md:px-10 py-6 md:py-8 mb-6'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 rounded-2xl bg-foreground text-lime grid place-items-center border-2 border-foreground transition-all ${appState !== 'idle' ? 'h-10 w-10' : 'h-14 w-14 shadow-brutal-sm'}`}>
              <Flame className={appState !== 'idle' ? 'h-5 w-5' : 'h-8 w-8'} strokeWidth={2.5} fill="currentColor" />
            </div>
            <div>
              <p className="label-eyebrow text-foreground/70 leading-none">Pair Up · v1</p>
              <h1 className={`leading-[0.9] mt-1 font-black transition-all ${appState !== 'idle' ? 'text-xl uppercase' : 'text-4xl md:text-6xl'}`}>
                {appState === 'connected' ? "You're connected, bruhh." : appState === 'searching' ? "Searching, bruhh." : <>Random video<br />chat, bruhh.</>}
              </h1>
              {appState === 'idle' && (
                <p className="mt-3 text-foreground/80 max-w-xl text-sm md:text-base font-medium">
                  Spin the roulette. Meet someone awesome. Skip with one tap.
                  No accounts, no awkward intros.
                </p>
              )}
              {profile && appState !== 'connected' && (
                <div className="mt-4">
                  <button
                    onClick={resetOnboarding}
                    className="inline-flex items-center gap-2 brutal-card-sm bg-card px-3 py-1.5 text-xs font-bold hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Joined as <span className="text-primary">{profile.name}</span> · Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`flex gap-3 md:items-center ${appState !== 'idle' ? 'flex-row' : 'flex-col md:items-end'}`}>
            <div className={`brutal-card-sm bg-card flex items-center transition-all ${appState !== 'idle' ? 'px-3 py-1.5 gap-2 min-w-fit' : 'px-4 py-3 gap-3 min-w-[220px]'}`}>
              {appState === "searching" ? (
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
              ) : (
                <div className={`rounded-full border-2 border-foreground transition-all ${appState === "connected" ? "h-3 w-3 bg-lime animate-pulse" : "h-5 w-5 bg-muted"}`} />
              )}
              <div>
                {appState !== 'connected' && <p className="label-eyebrow !text-[10px]">Status</p>}
                <p className={`${appState === 'connected' ? 'text-xs uppercase' : 'text-sm'} font-bold`}>
                  {appState === "searching" ? "Finding someone awesome…" : appState === "connected" ? "Connected!" : "Ready"}
                </p>
              </div>
            </div>

            {appState === 'idle' && (
              <div className="brutal-card-sm bg-card px-4 py-3 flex items-center gap-3 min-w-[220px]">
                <Users className="h-5 w-5" strokeWidth={2.5} />
                <div>
                  <p className="label-eyebrow !text-[10px]">Online now</p>
                  <p className="text-sm font-bold">12,438 strangers</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main stage — expands to fill height when connected */}
      <section className={`flex-1 min-h-0 relative transition-all duration-500 ${appState === 'idle' ? 'hidden lg:grid' : 'grid'} gap-5 grid-cols-1 lg:grid-cols-[1fr_1fr_450px]`}>

        {/* Local Video Tile — becomes PiP on small screens when connected */}
          <div className={`transition-all duration-500 ease-in-out min-h-0 min-w-0 absolute bottom-4 left-4 w-32 h-44 z-20 md:w-48 md:h-64 lg:relative lg:bottom-0 lg:left-0 lg:w-full lg:h-full lg:z-0`}>
            <VideoTile
              label={profile?.name ?? "You"}
              status={appState === "idle" ? "Idle" : "Camera ready"}
              isPip={appState !== 'idle'}
              showPlaceholder={appState !== 'connected'}
            >
              <video ref={localVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover scale-x-[-1] ${appState !== 'connected' ? 'opacity-0' : 'opacity-100'}`} />
            </VideoTile>
          </div>

          {/* Remote Video Tile — becomes Background on small screens when connected */}
          <div className={`transition-all duration-500 h-full w-full min-h-0 min-w-0 absolute inset-0 z-10 lg:relative`}>
            <VideoTile
              label="Stranger"
              status={appState === "searching" ? "Searching…" : appState === "connected" ? "Connected" : "Waiting for stranger…"}
              showPlaceholder={appState !== 'connected'}
            >
              <video ref={remoteVideoRef} autoPlay playsInline className={`h-full w-full object-cover ${appState !== 'connected' ? 'opacity-0' : 'opacity-100'}`} />
            </VideoTile>
          </div>

          {/* Chat Panel — hidden on mobile when connected to focus on video */}
          <div className={`transition-all duration-500 h-full min-h-0 min-w-0 ${showMobileChatState ? 'absolute inset-0 z-30 lg:relative lg:z-auto lg:block' : 'hidden lg:block'}`}>
            <ChatPanel
              messages={messages}
              currentUserId={socketRef.current?.id}
              inputValue={message}
              onInputChange={setMessage}
              onSend={sendMessage}
              isConnected={appState === "connected"}
            />
          </div>
        </section>

      {/* Controls */}
      <footer className={`transition-all duration-500 z-40 relative ${
        appState === 'idle' ? 'flex-1 lg:flex-none flex flex-col justify-center items-center lg:mt-4 lg:mb-2' : 'mt-4 mb-2 lg:mt-4'
      }`}>
        {appState === 'idle' ? (
          <button
            onClick={startChat}
            className="inline-flex items-center gap-3 brutal-card bg-lime text-foreground px-10 py-5 text-xl font-black uppercase tracking-wider hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-none transition-all active:translate-x-[2px] active:translate-y-[2px]"
          >
            <Flame className="h-7 w-7" strokeWidth={2.5} fill="currentColor" />
            Start Chatting
          </button>
        ) : (
          <>
            <ControlBar
              muted={muted}
              onToggleMute={() => setMuted(!muted)}
              camOff={camOff}
              onToggleCam={() => setCamOff(!camOff)}
              onEndCall={endChat}
              onSkip={skipChat}
              canSkip={appState === "connected" || appState === "searching"}
              onToggleChat={() => setShowMobileChat(!showMobileChatState)}
              hasUnread={hasUnread}
            />

            <p className="hidden md:block text-center text-xs text-muted-foreground font-medium mt-4 tracking-wide uppercase">
              Press <span className="px-2 py-0.5 bg-card border-2 border-foreground rounded-md font-bold text-foreground">SPACE</span> to skip ·
              <span className="px-2 py-0.5 bg-card border-2 border-foreground rounded-md font-bold text-foreground ml-2">M</span> to mute
            </p>
          </>
        )}
      </footer>

      <OnboardingDialog open={showOnboarding} onComplete={handleComplete} />
    </main>
  );
};


export default VideoChatApp;