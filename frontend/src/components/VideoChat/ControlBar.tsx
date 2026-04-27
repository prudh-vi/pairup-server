import { Mic, MicOff, PhoneOff, SkipForward, Video, VideoOff } from "lucide-react";

interface ControlBarProps {
  muted: boolean;
  onToggleMute: () => void;
  camOff: boolean;
  onToggleCam: () => void;
  onEndCall: () => void;
  onSkip: () => void;
  canSkip: boolean;
}

const ControlBar = ({
  muted,
  onToggleMute,
  camOff,
  onToggleCam,
  onEndCall,
  onSkip,
  canSkip,
}: ControlBarProps) => {
  const baseBtn =
    "h-14 w-14 grid place-items-center rounded-2xl border-2 border-foreground shadow-brutal-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]";

  return (
    <div className="flex items-center justify-center gap-3 md:gap-4">
      <button
        onClick={onToggleMute}
        className={`${baseBtn} ${muted ? "bg-destructive text-destructive-foreground" : "bg-card"}`}
        aria-label="Toggle microphone"
      >
        {muted ? <MicOff className="h-6 w-6" strokeWidth={2.5} /> : <Mic className="h-6 w-6" strokeWidth={2.5} />}
      </button>

      <button
        onClick={onToggleCam}
        className={`${baseBtn} ${camOff ? "bg-destructive text-destructive-foreground" : "bg-card"}`}
        aria-label="Toggle camera"
      >
        {camOff ? <VideoOff className="h-6 w-6" strokeWidth={2.5} /> : <Video className="h-6 w-6" strokeWidth={2.5} />}
      </button>

      <button
        onClick={onEndCall}
        className={`${baseBtn} bg-destructive text-destructive-foreground h-16 w-16 rounded-3xl`}
        aria-label="End call"
      >
        <PhoneOff className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <button
        onClick={onSkip}
        disabled={!canSkip}
        className={`${baseBtn} bg-lime disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="Next stranger"
      >
        <SkipForward className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default ControlBar;
