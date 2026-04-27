import { View, Text } from "react-native";
import { RTCView } from "react-native-webrtc";
import { User, VideoOff } from "lucide-react-native";

interface VideoPanelProps {
  streamURL?: string | null;
  isLocal?: boolean;
  isActive?: boolean;
  label?: string;
  className?: string;
}

const VideoPanel = ({
  streamURL,
  isLocal = false,
  isActive = false,
  label,
  className,
}: VideoPanelProps) => {
  return (
    <View className={`bg-gray-100 overflow-hidden relative ${className || 'flex-1 rounded-2xl'}`}>
      {/* Video element */}
      {streamURL && isActive ? (
        <RTCView
          streamURL={streamURL}
          style={{ flex: 1, backgroundColor: "#f3f4f6" }}
          objectFit="cover"
          mirror={isLocal}
        />
      ) : (
        /* Placeholder when no video */
        <View className="absolute inset-0 items-center justify-center bg-gray-100">
          <View className="items-center gap-3">
            <View className="rounded-full bg-gray-200 p-4">
              {isLocal ? (
                <VideoOff size={32} color="#9ca3af" />
              ) : (
                <User size={32} color="#9ca3af" />
              )}
            </View>
            <Text className="text-sm font-medium text-gray-500">
              {isLocal ? "Your camera" : "Waiting for stranger..."}
            </Text>
          </View>
        </View>
      )}

      {/* Label badge */}
      {label && (
        <View className="absolute bottom-3 left-3 bg-white/80 rounded-lg px-3 py-1.5">
          <Text className="text-xs font-semibold text-gray-900">{label}</Text>
        </View>
      )}
    </View>
  );
};

export default VideoPanel;
