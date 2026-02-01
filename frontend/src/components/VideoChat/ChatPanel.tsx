import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle } from "lucide-react";

interface Message {
  sender: string;
  message: string;
}

interface ChatPanelProps {
  messages: Message[];
  currentUserId?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isConnected: boolean;
}

const ChatPanel = ({
  messages,
  currentUserId,
  inputValue,
  onInputChange,
  onSend,
  isConnected,
}: ChatPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="rounded-full gradient-fire p-2">
          <MessageCircle className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Chat</h3>
          <p className="text-xs text-muted-foreground">
            {isConnected ? "Connected with stranger" : "Waiting for connection..."}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Say hi to your new friend! 👋</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.sender === currentUserId;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-4 py-2.5 rounded-2xl
                      ${isMe
                        ? "gradient-fire text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                      }
                    `}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
            disabled={!isConnected}
            className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSend}
            disabled={!isConnected || !inputValue.trim()}
            className="h-12 w-12 rounded-xl gradient-fire flex items-center justify-center text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <Send className="h-5 w-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatPanel;
