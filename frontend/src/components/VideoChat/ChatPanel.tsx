import { MessageCircle, Send } from "lucide-react";
import { useEffect, useRef } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <aside className="brutal-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="px-5 py-4 border-b-2 border-foreground bg-lime/40 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-foreground text-background grid place-items-center border-2 border-foreground">
          <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-lg leading-none font-black uppercase">Chat</h3>
          <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-tight">
            {isConnected ? "Connected — say hi 👋" : "Waiting for connection…"}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <div className="h-14 w-14 rounded-full bg-secondary border-2 border-foreground grid place-items-center mb-4">
              <MessageCircle className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <p className="font-bold text-foreground uppercase tracking-tight">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1 uppercase font-black">
              Say hi to your new friend! 👋
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === currentUserId;
            return (
              <div 
                key={index} 
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div 
                  className={`
                    max-w-[85%] px-4 py-2.5 rounded-2xl border-2 border-foreground shadow-brutal-sm text-sm font-bold
                    ${isMe ? "bg-card text-foreground" : "bg-lime text-foreground"}
                  `}
                >
                  <p className="leading-relaxed break-words">{msg.message}</p>
                </div>
                <span className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-widest">
                  {isMe ? "YOU" : "STRANGER"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="p-3 border-t-2 border-foreground bg-secondary/40">
        <form 
          onSubmit={(e) => { e.preventDefault(); onSend(); }}
          className="flex gap-2"
        >
          <input
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={!isConnected}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={isConnected ? "Type a message…" : "Connect to start chatting"}
            className="flex-1 h-12 px-4 rounded-xl border-2 border-foreground bg-card text-sm font-bold placeholder:text-muted-foreground focus:outline-none focus:shadow-brutal-sm transition-shadow disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputValue.trim()}
            className="h-12 w-12 grid place-items-center rounded-xl bg-lime border-2 border-foreground shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            aria-label="Send message"
          >
            <Send className="h-5 w-5 group-hover:rotate-12 transition-transform" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </aside>
  );
};

export default ChatPanel;
