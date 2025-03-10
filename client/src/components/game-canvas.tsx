import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GameCanvasProps {
  code: string;
  onDebugLog?: (log: string) => void;
}

export function GameCanvas({ code, onDebugLog }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const { toast } = useToast();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !code) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clean up any previous animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }

    onDebugLog?.("Initializing game canvas...");
    onDebugLog?.(`Canvas size: ${canvas.width}x${canvas.height}`);

    try {
      // Expose canvas and ctx to the game code scope
      const gameCode = `
        let animationFrameId;

        ${code}
      `;

      onDebugLog?.("Creating game function...");
      const gameFunction = new Function("canvas", "ctx", "requestAnimationFrame", "cancelAnimationFrame", gameCode);

      onDebugLog?.("Starting game execution...");
      gameFunction(
        canvas,
        ctx,
        (callback: FrameRequestCallback) => {
          frameRef.current = requestAnimationFrame(callback);
          return frameRef.current;
        },
        (id: number) => {
          if (frameRef.current === id) {
            cancelAnimationFrame(id);
            frameRef.current = undefined;
          }
        }
      );

      onDebugLog?.("Game started successfully");
    } catch (error) {
      console.error("Error executing game code:", error);
      onDebugLog?.(`Error executing game code: ${error}`);

      toast({
        title: "Game Error",
        description: "There was an error running the game. Check the debug logs for details.",
        variant: "destructive",
      });

      // Cleanup on error
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
    }

    // Cleanup function
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
        onDebugLog?.("Game animation stopped");
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [code, toast, onDebugLog]);

  return (
    <Card className="p-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-[600px] border border-border rounded-md bg-black"
        style={{ aspectRatio: "4/3" }}
      />
    </Card>
  );
}