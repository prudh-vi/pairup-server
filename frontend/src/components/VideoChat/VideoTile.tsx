import { User } from "lucide-react";
import { ReactNode } from "react";

interface VideoTileProps {
  label: string;
  status?: string;
  accent?: boolean;
  children?: ReactNode;
}

const VideoTile = ({ label, status, accent = false, children }: VideoTileProps) => {
  return (
    <div
      className={`relative aspect-[3/4] md:aspect-auto md:h-full w-full rounded-[var(--radius)] border-2 border-foreground overflow-hidden shadow-brutal ${
        accent ? "bg-lime" : "bg-card"
      }`}
    >
      {/* Decorative grain / pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--ink)) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Center placeholder */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-foreground/70">
        <div className="h-20 w-20 rounded-full border-2 border-foreground/40 border-dashed flex items-center justify-center">
          <User className="h-10 w-10" strokeWidth={2.5} />
        </div>
        <p className="font-bold text-sm tracking-wide">{status ?? "Waiting…"}</p>
      </div>

      {children}

      {/* Label chip */}
      <div className="absolute bottom-4 left-4">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-bold tracking-wider uppercase border-2 border-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
          {label}
        </span>
      </div>
    </div>
  );
};

export default VideoTile;
