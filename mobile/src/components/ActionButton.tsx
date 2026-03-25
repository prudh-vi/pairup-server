import { TouchableOpacity, Text, View } from "react-native";

interface ActionButtonProps {
  icon: any;
  label: string;
  variant?: "primary" | "danger";
  size?: "default" | "lg";
  onClick: () => void;
  disabled?: boolean;
}

const ActionButton = ({
  icon: Icon,
  label,
  variant = "primary",
  size = "default",
  onClick,
  disabled = false,
}: ActionButtonProps) => {
  const isDanger = variant === "danger";
  const bgClass = isDanger ? "bg-red-500" : "bg-orange-500";
  const textClass = isDanger ? "text-white" : "text-white";
  
  return (
    <TouchableOpacity
      onPress={onClick}
      disabled={disabled}
      className={`rounded-2xl items-center justify-center shadow-sm ${bgClass} ${
        size === "lg" ? "flex-1 py-4 flex-row gap-2" : "p-4"
      } ${disabled ? "opacity-50" : ""}`}
      activeOpacity={0.8}
    >
      <Icon size={20} color="#fff" />
      {size === "lg" && <Text className={`font-bold text-lg ${textClass}`}>{label}</Text>}
    </TouchableOpacity>
  );
};

export default ActionButton;
