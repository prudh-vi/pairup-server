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
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:34.126.207.137:3478',
      username: 'pairup_333dfc31',
      credential: '62d0f87b0181fa1e7b70289ed0587d3a'
    },
    {
      urls: 'turn:34.126.207.137:3478?transport=tcp',
      username: 'pairup_333dfc31',
      credential: '62d0f87b0181fa1e7b70289ed0587d3a'
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
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
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    peer.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(console.error);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        if (event.candidate.type === 'relay') hasRelayCandidate.current = true;
        socket.emit("webrtc:ice", { roomId: currentRoomId, candidate: event.candidate });
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed") peer.restartIce?.();
    };

    return peer;
  }, []);

  const handleMatched = useCallback(async (socket: Socket, { roomId, role }: { roomId: string; role: string }) => {
    setRoomId(roomId);
    setAppState("connected");
    const peer = createPeerConnection(socket, roomId);

    try {
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
        }
      }

      stream.getTracks().forEach(track => peer.addTrack(track, stream!));

      if (pendingCandidatesRef.current.length > 0) {
        for (const candidate of pendingCandidatesRef.current) {
          if (peer.remoteDescription) await peer.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
      }

      if (role === "caller") {
        const offer = await peer.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
        await peer.setLocalDescription(offer);
        socket.emit("webrtc:offer", { roomId, offer });
      }
    } catch (error) {
      console.error(error);
      setAppState("idle");
    }
  }, [createPeerConnection]);

  const startChat = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("client:start_chat");
      setAppState("searching");
      return;
    }

    setAppState("searching");
    const socket = io("https://backxpairup.zrxprudhvi.tech", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => socket.emit("client:start_chat"));
    socket.on("server:matched", (data) => handleMatched(socket, data));
    
    socket.on("webrtc:offer", async ({ offer, roomId }) => {
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        if (pendingCandidatesRef.current.length > 0) {
          for (const candidate of pendingCandidatesRef.current) {
            await peer.addIceCandidate(candidate);
          }
          pendingCandidatesRef.current = [];
        }
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc:answer", { roomId, answer });
      } catch (error) { console.error(error); }
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      const peer = peerRef.current;
      if (!peer || peer.signalingState !== "have-local-offer") return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        if (pendingCandidatesRef.current.length > 0) {
          for (const candidate of pendingCandidatesRef.current) {
            await peer.addIceCandidate(candidate);
          }
          pendingCandidatesRef.current = [];
        }
      } catch (error) { console.error(error); }
    });

    socket.on("webrtc:ice", async ({ candidate }) => {
      const peer = peerRef.current;
      if (!peer || !peer.remoteDescription) {
        pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        return;
      }
      try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (error) { console.error(error); }
    });

    socket.on("server:new_message", (data) => setMessages((prev) => [...prev, data]));
    
    socket.on("server:partner_left", () => {
      cleanupConnection();
      setAppState("searching");
      socket.emit("client:start_chat");
    });

    socket.on("disconnect", () => console.log("❌ Disconnected"));
  }, [handleMatched, cleanupConnection]);

  const sendMessage = useCallback(() => {
    if (!socketRef.current || !roomId || !message.trim()) return;
    socketRef.current.emit("client:send_message", { roomId, message: message.trim() });
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

  // Start chat automatically if onboarded
  useEffect(() => {
    if (hydrated && profile && appState === "idle") {
      startChat();
    }
  }, [hydrated, profile]);

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

  const showOnboarding = hydrated && !profile;
  return (
    <main className={`min-h-screen bg-background text-foreground flex flex-col transition-all duration-500 ${appState === 'connected' ? 'px-2 md:px-6 py-2 md:py-4 h-screen overflow-hidden' : 'px-4 md:px-8 py-6'}`}>
      {/* Hero header card — collapses when connected */}
      <header className={`brutal-card bg-lime transition-all duration-500 ease-in-out ${appState === 'connected' ? 'px-6 py-3 mb-4' : 'px-6 md:px-10 py-6 md:py-8 mb-6'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 rounded-2xl bg-foreground text-lime grid place-items-center border-2 border-foreground transition-all ${appState === 'connected' ? 'h-10 w-10' : 'h-14 w-14 shadow-brutal-sm'}`}>
              <Flame className={appState === 'connected' ? 'h-5 w-5' : 'h-8 w-8'} strokeWidth={2.5} fill="currentColor" />
            </div>
            <div>
              <p className="label-eyebrow text-foreground/70 leading-none">Pair Up · v1</p>
              <h1 className={`leading-[0.9] mt-1 font-black transition-all ${appState === 'connected' ? 'text-xl uppercase' : 'text-4xl md:text-6xl'}`}>
                {appState === 'connected' ? "You're connected, bruhh." : <>Random video<br />chat, bruhh.</>}
              </h1>
              {appState !== 'connected' && (
                <p className="mt-3 text-foreground/80 max-w-xl text-sm md:text-base font-medium">
                  Spin the roulette. Meet someone awesome. Skip with one tap.
                  No accounts, no awkward intros.
                </p>
              )}
              {profile && appState !== 'connected' && (
                <button
                  onClick={resetOnboarding}
                  className="mt-3 inline-flex items-center gap-2 brutal-card-sm bg-card px-3 py-1.5 text-xs font-bold hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Joined as <span className="text-primary">{profile.name}</span> · Edit
                </button>
              )}
            </div>
          </div>

          <div className={`flex gap-3 md:items-center ${appState === 'connected' ? 'flex-row' : 'flex-col md:items-end'}`}>
            <div className={`brutal-card-sm bg-card flex items-center transition-all ${appState === 'connected' ? 'px-3 py-1.5 gap-2 min-w-fit' : 'px-4 py-3 gap-3 min-w-[220px]'}`}>
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
            
            {appState !== 'connected' && (
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
      <section className={`flex-1 min-h-0 relative transition-all duration-500 ${appState === 'connected' ? 'grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1fr_450px]' : 'grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1fr_380px]'}`}>
        
        {/* Local Video Tile — becomes PiP on small screens when connected */}
        <div className={`transition-all duration-500 ease-in-out ${
          appState === 'connected' 
            ? 'absolute bottom-4 left-4 w-32 h-44 z-20 md:w-48 md:h-64 lg:relative lg:bottom-0 lg:left-0 lg:w-full lg:h-full lg:z-0' 
            : 'relative w-full h-full'
        }`}>
          <VideoTile 
            label={profile?.name ?? "You"} 
            status={appState === "idle" ? "Idle" : "Camera ready"} 
            isPip={appState === 'connected'}
          >
             <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
          </VideoTile>
        </div>

        {/* Remote Video Tile — becomes Background on small screens when connected */}
        <div className={`transition-all duration-500 h-full w-full ${
          appState === 'connected' ? 'absolute inset-0 z-10 lg:relative' : 'relative'
        }`}>
          <VideoTile 
            label="Stranger" 
            status={appState === "searching" ? "Searching…" : appState === "connected" ? "Connected" : "Waiting for stranger…"}
          >
             <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          </VideoTile>
        </div>

        {/* Chat Panel — hidden on mobile when connected to focus on video */}
        <div className={`transition-all duration-500 h-full ${
          appState === 'connected' ? 'hidden lg:block' : 'block'
        }`}>
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
      <footer className={`transition-all duration-500 z-30 ${appState === 'connected' ? 'mt-4 mb-2 lg:mt-4' : 'mt-8 mb-4'}`}>
        <ControlBar 
           muted={muted} 
           onToggleMute={() => setMuted(!muted)} 
           camOff={camOff} 
           onToggleCam={() => setCamOff(!camOff)}
           onEndCall={endChat}
           onSkip={skipChat}
           canSkip={appState === "connected" || appState === "searching"}
        />

        <p className="text-center text-xs text-muted-foreground font-medium mt-4 tracking-wide uppercase">
          Press <span className="px-2 py-0.5 bg-card border-2 border-foreground rounded-md font-bold text-foreground">SPACE</span> to skip ·
          <span className="px-2 py-0.5 bg-card border-2 border-foreground rounded-md font-bold text-foreground ml-2">M</span> to mute
        </p>
      </footer>

      <OnboardingDialog open={showOnboarding} onComplete={handleComplete} />
    </main>
  );
};


export default VideoChatApp;