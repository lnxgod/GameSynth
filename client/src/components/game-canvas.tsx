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
      frameRef.current = undefined;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    onDebugLog?.("Initializing game canvas...");

    try {
      // Prepare the animation frame handler
      const handleAnimationFrame = (callback: FrameRequestCallback) => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
        frameRef.current = requestAnimationFrame(callback);
        return frameRef.current;
      };

      // Create a safe execution context for the game code
      const gameCode = `
        "use strict";
        // Game variables will be declared here
        let animationFrameId;

        try {
          ${code}
        } catch (error) {
          throw new Error("Game initialization failed: " + error.message);
        }
      `;

      const gameFunction = new Function(
        "canvas",
        "ctx",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        gameCode
      );

      // Execute the game code with controlled context
      gameFunction(
        canvas,
        ctx,
        handleAnimationFrame,
        () => {
          if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = undefined;
          }
        }
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

      // Ensure cleanup on error
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