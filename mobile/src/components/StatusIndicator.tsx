import { View, Text } from "react-native";

interface StatusIndicatorProps {
  status: "idle" | "searching" | "connected";
  message: string;
}

const StatusIndicator = ({ status, message }: StatusIndicatorProps) => {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className={`h-2.5 w-2.5 rounded-full ${
          status === "idle"
            ? "bg-gray-400"
            : status === "searching"
            ? "bg-orange-500 animate-pulse"
            : "bg-green-500"
        }`}
      />
      <Text className="text-sm font-medium text-muted-foreground">{message}</Text>
    </View>
  );
};

export default StatusIndicator;
