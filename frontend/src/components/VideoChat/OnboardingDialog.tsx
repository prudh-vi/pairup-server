import { useState } from "react";
import { Camera, Mic, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Step = "name" | "permissions" | "error";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: (name: string) => void;
}

const OnboardingDialog = ({ open, onComplete }: OnboardingDialogProps) => {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2 && trimmed.length <= 24;

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValid) return;
    setStep("permissions");
  };

  const requestPermissions = async () => {
    setRequesting(true);
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Release immediately — actual capture is owned by the video stage later.
      stream.getTracks().forEach((t) => t.stop());
      onComplete(trimmed);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "NotAllowedError"
            ? "Permission denied. Enable mic & camera in your browser settings to continue."
            : err.name === "NotFoundError"
            ? "No camera or microphone detected on this device."
            : err.message
          : "Could not access mic & camera.";
      setErrorMsg(msg);
      setStep("error");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="brutal-card bg-card max-w-md p-0 gap-0 border-2 border-foreground [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-lime border-b-2 border-foreground px-6 py-4">
          <p className="label-eyebrow text-foreground/70">
            {step === "name" ? "Step 1 of 2" : step === "permissions" ? "Step 2 of 2" : "Heads up"}
          </p>
          <DialogTitle className="text-2xl md:text-3xl mt-1 leading-none font-black uppercase">
            {step === "name" && "What's your name, bruhh?"}
            {step === "permissions" && "Mic & camera, please."}
            {step === "error" && "Almost there."}
          </DialogTitle>
        </div>

        {step === "name" && (
          <form onSubmit={handleNameSubmit} className="p-6 space-y-5">
            <DialogDescription className="text-foreground/80 font-bold text-sm uppercase">
              Strangers will see this when you connect. Pick something fun — you can change it later.
            </DialogDescription>
            <div>
              <label htmlFor="display-name" className="label-eyebrow block mb-2">
                Display name
              </label>
              <input
                id="display-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="e.g. PixelPanda"
                className="w-full bg-background border-2 border-foreground rounded-md px-4 py-3 font-bold text-lg outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
              />
              <p className="text-xs text-muted-foreground font-medium mt-2">
                {trimmed.length}/24 · 2 characters minimum
              </p>
            </div>
            <button
              type="submit"
              disabled={!nameValid}
              className="w-full bg-foreground text-lime border-2 border-foreground rounded-md px-4 py-3 font-black uppercase tracking-wide hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" strokeWidth={2.5} />
              Continue
            </button>
          </form>
        )}

        {step === "permissions" && (
          <div className="p-6 space-y-5">
            <DialogDescription className="text-foreground/80 font-bold text-sm uppercase">
              We need your mic and camera to pair you with strangers. Nothing is recorded — streams stay between you two.
            </DialogDescription>
            <div className="grid grid-cols-2 gap-3">
              <div className="brutal-card-sm bg-background px-4 py-4 text-center">
                <Camera className="h-7 w-7 mx-auto mb-2" strokeWidth={2.5} />
                <p className="font-bold text-sm">Camera</p>
                <p className="text-xs text-muted-foreground font-medium">Required</p>
              </div>
              <div className="brutal-card-sm bg-background px-4 py-4 text-center">
                <Mic className="h-7 w-7 mx-auto mb-2" strokeWidth={2.5} />
                <p className="font-bold text-sm">Microphone</p>
                <p className="text-xs text-muted-foreground font-medium">Required</p>
              </div>
            </div>
            <button
              onClick={requestPermissions}
              disabled={requesting}
              className="w-full bg-foreground text-lime border-2 border-foreground rounded-md px-4 py-3 font-black uppercase tracking-wide hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {requesting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  Requesting…
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" strokeWidth={2.5} />
                  Allow & join
                </>
              )}
            </button>
            <button
              onClick={() => setStep("name")}
              className="w-full text-sm font-bold text-foreground/70 hover:text-foreground"
            >
              ← Back
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="p-6 space-y-5">
            <div className="brutal-card-sm bg-background px-4 py-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-sm font-medium text-foreground/90">{errorMsg}</p>
            </div>
            <button
              onClick={() => {
                setStep("permissions");
                setErrorMsg("");
              }}
              className="w-full bg-foreground text-lime border-2 border-foreground rounded-md px-4 py-3 font-black uppercase tracking-wide hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              Try again
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
