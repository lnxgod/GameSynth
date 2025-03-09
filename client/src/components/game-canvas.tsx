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

    // Clear previous animation frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    onDebugLog?.("Initializing game canvas...");
    onDebugLog?.("Processing game code...");

    try {
      // Create a safe execution environment with common game variables
      const gameFunction = new Function("canvas", "ctx", "debug", `
        // Set up the game loop variables
        let animationFrameId;

        // Game initialization
        try {
          ${code}
        } catch (error) {
          debug("Game initialization error: " + error.message);
          throw error;
        }
      `);

      // Execute the game code
      gameFunction(canvas, ctx, onDebugLog);
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
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
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