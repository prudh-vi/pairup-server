import { User } from "lucide-react";
import { ReactNode } from "react";

interface VideoTileProps {
  label: string;
  status?: string;
  accent?: boolean;
  children?: ReactNode;
  isPip?: boolean;
}

const VideoTile = ({ label, status, accent = false, children, isPip = false }: VideoTileProps) => {
  return (
    <div
      className={`relative rounded-[var(--radius)] border-2 border-foreground overflow-hidden shadow-brutal transition-all duration-500 ${accent ? "bg-lime" : "bg-card"
        } ${isPip ? "aspect-[3/4]" : "aspect-[3/4] md:aspect-auto md:h-full w-full"}`}
    >

      {/* Decorative grain / pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--ink)) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Center placeholder — only show if no children */}
      {!children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-foreground/70">
          <div className="h-20 w-20 rounded-full border-2 border-foreground/40 border-dashed flex items-center justify-center">
            <User className="h-10 w-10" strokeWidth={2.5} />
          </div>
          <p className="font-bold text-sm tracking-wide">{status ?? "Waiting…"}</p>
        </div>
      )}

      {/* Video element */}
      {children}

      {/* Label chip */}
      <div className={`absolute bottom-4 left-4 transition-all z-10 ${isPip ? 'scale-75 origin-bottom-left' : ''}`}>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-bold tracking-wider uppercase border-2 border-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
          {label}
        </span>
      </div>

    </div>
  );
};

export default VideoTile;