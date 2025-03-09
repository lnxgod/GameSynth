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
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous animation frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    onDebugLog?.("Initializing game canvas...");

    try {
      // Create a safe execution context with proper variable scoping
      const gameFunction = new Function('canvas', 'ctx', 'requestAnimationFrame', 'cancelAnimationFrame', `
        return (function() {
          // Game-specific variables will be declared here
          let animationFrameId = null;

          // The actual game code
          ${code}
        })();
      `);

      // Execute the game code with proper context
      gameFunction(
        canvas,
        ctx,
        (callback: FrameRequestCallback) => {
          const id = requestAnimationFrame(callback);
          frameRef.current = id;
          return id;
        },
        cancelAnimationFrame
      );

      onDebugLog?.("Game code executed successfully");
    } catch (error) {
      console.error("Error executing game code:", error);
      onDebugLog?.(`Error executing game code: ${error}`);
      toast({
        title: "Game Error",
        description: "There was an error running the game. Check the debug logs for details.",
        variant: "destructive",
      });
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        onDebugLog?.("Game animation stopped");
      }
      // Clear the canvas on cleanup
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