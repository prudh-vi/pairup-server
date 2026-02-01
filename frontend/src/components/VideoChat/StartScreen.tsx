import { motion } from "framer-motion";
import { Flame, Video, MessageCircle, Globe, Sparkles } from "lucide-react";

interface StartScreenProps {
  onStart: () => void;
  isLoading?: boolean;
}

const StartScreen = ({ onStart, isLoading = false }: StartScreenProps) => {
  const features = [
    { icon: Video, label: "HD Video" },
    { icon: MessageCircle, label: "Live Chat" },
    { icon: Globe, label: "Worldwide" },
    { icon: Sparkles, label: "Anonymous" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md mx-auto"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-3 mb-8"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl gradient-fire flex items-center justify-center glow-fire">
              <Flame className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="absolute -inset-1 rounded-2xl gradient-fire opacity-30 blur-lg -z-10" />
          </div>
          <h1 className="text-5xl font-black gradient-fire-text">PairUp</h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-muted-foreground mb-10"
        >
          Meet new people. Make real connections.
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-6 mb-10"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-12 w-12 rounded-xl glass-panel flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{feature.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Start Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          disabled={isLoading}
          className="w-full max-w-xs mx-auto py-4 px-8 rounded-2xl gradient-fire text-primary-foreground font-bold text-lg glow-fire transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Video className="h-5 w-5" />
              <span>Start Chatting</span>
            </>
          )}
        </motion.button>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-xs text-muted-foreground/60"
        >
          By using PairUp, you agree to our community guidelines.
          <br />
          Be respectful and have fun! 🎉
        </motion.p>
      </motion.div>
    </div>
  );
};

export default StartScreen;
