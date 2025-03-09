import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GameCanvasProps {
  code: string;
}

export function GameCanvas({ code }: GameCanvasProps) {
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

    try {
      // Create a safe execution environment with common game variables
      const gameFunction = new Function("canvas", "ctx", `
        // Set up the game loop
        let animationFrameId;
        const requestAnimationFrame = window.requestAnimationFrame;
        const cancelAnimationFrame = window.cancelAnimationFrame;

        // Execute the game code
        try {
          ${code}
        } catch (error) {
          console.error("Game code execution error:", error);
          throw error;
        }
      `);

      // Execute the game code
      gameFunction(canvas, ctx);
    } catch (error) {
      console.error("Error executing game code:", error);
      toast({
        title: "Game Error",
        description: "There was an error running the game. Check the console for details.",
        variant: "destructive",
      });
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      // Clear the canvas on cleanup
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [code, toast]);

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