import { motion } from "framer-motion";
import { Loader2, Wifi, WifiOff, Search } from "lucide-react";

interface StatusIndicatorProps {
  status: "idle" | "searching" | "connected" | "disconnected";
  message?: string;
}

const StatusIndicator = ({ status, message }: StatusIndicatorProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "idle":
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: "bg-muted-foreground",
          text: message || "Ready to connect",
        };
      case "searching":
        return {
          icon: <Search className="h-4 w-4 animate-pulse" />,
          color: "bg-primary",
          text: message || "Finding your match...",
          pulse: true,
        };
      case "connected":
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: "bg-success",
          text: message || "Connected",
        };
      case "disconnected":
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: "bg-destructive",
          text: message || "Disconnected",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel inline-flex items-center gap-2.5 rounded-full px-4 py-2"
    >
      <div className="relative">
        <div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
        {config.pulse && (
          <div className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${config.color} animate-ping`} />
        )}
      </div>
      <span className="text-sm font-medium text-foreground">{config.text}</span>
      {status === "searching" && (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      )}
    </motion.div>
  );
};

export default StatusIndicator;
