import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "secondary" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  size = "md",
  disabled = false,
}: ActionButtonProps) => {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-14 w-14",
    lg: "h-16 w-16",
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
  };

  const variantClasses = {
    primary: "gradient-fire text-primary-foreground glow-fire hover:opacity-90",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    secondary: "glass-panel text-foreground hover:bg-muted/80",
    success: "bg-success text-success-foreground hover:bg-success/90",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]} 
        ${variantClasses[variant]}
        rounded-full flex items-center justify-center
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary/50
      `}
      title={label}
    >
      <Icon className={iconSizes[size]} />
    </motion.button>
  );
};

export default ActionButton;
