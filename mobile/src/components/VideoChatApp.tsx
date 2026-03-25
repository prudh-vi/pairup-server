import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Text, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { io, Socket } from "socket.io-client";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import { Flame, PhoneOff, SkipForward } from "lucide-react-native";

import VideoPanel from "./VideoPanel";
import ChatPanel from "./ChatPanel";
import StatusIndicator from "./StatusIndicator";
import ActionButton from "./ActionButton";
import StartScreen from "./StartScreen";

interface Message {
  sender: string;
  message: string;
}

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:34.126.207.137:3478",
      username: "pairup_333dfc31",
      credential: "62d0f87b0181fa1e7b70289ed0587d3a",
    },
    {
      urls: "turn:34.126.207.137:3478?transport=tcp",
      username: "pairup_333dfc31",
      credential: "62d0f87b0181fa1e7b70289ed0587d3a",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

const VideoChatApp = () => {
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
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
    setRemoteStream(null);
    setRoomId("");
    setMessages([]);
    setMessage("");
  }, []);

  const stopLocalStream = useCallback(() => {
    console.log("🛑 Stopping local stream...");
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const createPeerConnection = useCallback((socket: Socket, currentRoomId: string) => {
    console.log("🔧 Creating peer connection RIGHT NOW (synchronous)");
    
    // @ts-ignore
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    peer.addEventListener("track", (event: any) => {
      console.log(`🎥 Received remote track`);
      if (event.streams && event.streams[0]) {
        console.log("📺 Setting remote stream");
        setRemoteStream(event.streams[0]);
      }
    });

    peer.addEventListener("icecandidate", (event: any) => {
      if (event.candidate) {
        console.log(`📡 ICE candidate generated`);
        socket.emit("webrtc:ice", {
          roomId: currentRoomId,
          candidate: event.candidate,
        });
      }
    });

    peer.addEventListener("connectionstatechange", () => {
      console.log(`🔌 Connection: ${peer.connectionState}`);
      if (peer.connectionState === "connected") {
        console.log("✅✅✅ CONNECTED!");
      } else if (peer.connectionState === "failed") {
        console.error("❌ FAILED");
        // @ts-ignore
        peer.restartIce?.();
      }
    });

    return peer;
  }, []);

  const handleMatched = useCallback(
    async (socket: Socket, { roomId, role }: { roomId: string; role: string }) => {
      console.log(`🎯 MATCHED! Room: ${roomId} | Role: ${role}`);
      
      setRoomId(roomId);
      setAppState("connected");

      const peer = createPeerConnection(socket, roomId);

      try {
        let stream = localStream;
        
        if (!stream) {
          console.log("🎤 Getting media...");
          const isFront = true;
          const sourceInfos: any = await mediaDevices.enumerateDevices();
          let videoSourceId;
          for (let i = 0; i < sourceInfos.length; i++) {
            const sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === "videoinput" && sourceInfo.facing === (isFront ? "front" : "environment")) {
              videoSourceId = sourceInfo.deviceId;
            }
          }

          stream = await mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: 1280,
              height: 720,
              frameRate: 30,
              facingMode: isFront ? "user" : "environment",
              deviceId: videoSourceId,
            },
          });
          
          console.log("✅ Media OK");
          setLocalStream(stream);
        }

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        if (pendingCandidatesRef.current.length > 0) {
          for (const candidate of pendingCandidatesRef.current) {
            try {
              if (peer.remoteDescription) {
                await peer.addIceCandidate(candidate);
              }
            } catch (err) {
              console.error("Error with queued candidate:", err);
            }
          }
          pendingCandidatesRef.current = [];
        }

        if (role === "caller") {
          console.log("📞 Creating offer...");
          const offer = await peer.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          
          await peer.setLocalDescription(offer);
          socket.emit("webrtc:offer", { roomId, offer });
        }
      } catch (error) {
        console.error("❌ Error:", error);
        Alert.alert("Error", "Camera/mic failed. Please allow access.");
        setAppState("idle");
      }
    },
    [createPeerConnection, localStream]
  );

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

    socket.on("connect", () => {
      console.log(`✅ Connected: ${socket.id}`);
      socket.emit("client:start_chat");
    });

    socket.on("server:matched", (data) => {
      handleMatched(socket, data);
    });

    socket.on("webrtc:offer", async ({ offer, roomId }) => {
      console.log("📥 Got offer");
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
      } catch (error) {
        console.error("❌ Offer error:", error);
      }
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      console.log("📥 Got answer");
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
      } catch (error) {
        console.error("❌ Answer error:", error);
      }
    });

    socket.on("webrtc:ice", async ({ candidate }) => {
      const peer = peerRef.current;
      if (!peer || !peer.remoteDescription) {
        pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        return;
      }

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
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

  const getStatusConfig = () => {
    switch (appState) {
      case "idle":
        return { status: "idle" as const, message: "Ready to connect" };
      case "searching":
        return { status: "searching" as const, message: "Finding someone..." };
      case "connected":
        return { status: "connected" as const, message: "Connected!" };
    }
  };

  if (appState === "idle") {
    return <StartScreen onStart={startChat} />;
  }

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white" 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-2">
          <View className="h-10 w-10 rounded-xl bg-orange-500 items-center justify-center">
            <Flame size={20} color="#fff" />
          </View>
          <Text className="text-xl font-bold text-orange-500">PairUp</Text>
        </View>
        <StatusIndicator {...getStatusConfig()} />
      </View>

      <View className="flex-1 p-4 flex-col gap-4">
        {/* Videos Row */}
        <View className="h-48 flex-row gap-4">
          <View className="flex-1">
            <VideoPanel 
              streamURL={localStream?.toURL()} 
              isActive={localStream !== null} 
              isLocal 
              label="You" 
            />
          </View>
          <View className="flex-1">
            <VideoPanel
              streamURL={remoteStream?.toURL()}
              isActive={appState === "connected"}
              label="Stranger"
            />
          </View>
        </View>

        {/* Chat Area */}
        <View className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-20 lg:mb-0">
          <ChatPanel
            messages={messages}
            currentUserId={socketRef.current?.id}
            inputValue={message}
            onInputChange={setMessage}
            onSend={sendMessage}
            isConnected={appState === "connected"}
          />
        </View>
      </View>

      {/* Action Buttons Overlay */}
      {(appState === "searching" || appState === "connected") && (
        <View className="absolute bottom-6 left-0 right-0 px-4">
          <View className="bg-white/90 rounded-3xl p-3 flex-row justify-center gap-4 shadow-lg border border-gray-100 mx-auto w-full max-w-sm">
            <ActionButton 
              icon={PhoneOff} 
              label="End Call" 
              variant="danger" 
              onClick={endChat} 
            />
            <ActionButton
              icon={SkipForward}
              label="Next"
              variant="primary"
              size="lg"
              onClick={skipChat}
              disabled={appState !== "connected"}
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default VideoChatApp;
