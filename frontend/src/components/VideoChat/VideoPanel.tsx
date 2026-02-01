import { forwardRef } from "react";
import { motion } from "framer-motion";
import { User, Video, VideoOff } from "lucide-react";

interface VideoPanelProps {
  isLocal?: boolean;
  isActive?: boolean;
  label?: string;
}

const VideoPanel = forwardRef<HTMLVideoElement, VideoPanelProps>(
  ({ isLocal = false, isActive = false, label }, ref) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl h-full w-full"
      >
        {/* Video element */}
        <video
          ref={ref}
          autoPlay
          muted={isLocal}
          playsInline
          className="h-full w-full object-cover bg-secondary"
        />

        {/* Placeholder when no video */}
        {!isActive && (
  <div className="absolute inset-0 flex items-center justify-center bg-secondary pointer-events-none">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <div className="rounded-full bg-muted p-4">
        {isLocal ? (
          <VideoOff className="h-8 w-8" />
        ) : (
          <User className="h-8 w-8" />
        )}
      </div>
      <span className="text-sm font-medium">
        {isLocal ? "Your camera" : "Waiting for stranger..."}
      </span>
    </div>
  </div>
)}


        {/* Label badge */}
        {label && (
          <div className="absolute bottom-3 left-3 glass-panel rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-foreground">{label}</span>
          </div>
        )}

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </motion.div>
    );
  }
);

VideoPanel.displayName = "VideoPanel";

export default VideoPanel;
