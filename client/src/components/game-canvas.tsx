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
  const frameCountRef = useRef<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement || !code) return;

    const context = canvasElement.getContext("2d");
    if (!context) return;

    // Clear previous animation frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
      frameCountRef.current = 0;
    }

    // Clear the canvas
    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

    onDebugLog?.("Initializing game canvas...");

    try {
      // Prepare a controlled animation frame handler with safety check
      const handleFrame = (callback: FrameRequestCallback) => {
        frameCountRef.current++;

        // Safety check - prevent runaway animations
        if (frameCountRef.current > 1000) {
          onDebugLog?.("Safety: Animation frame limit reached, stopping game");
          if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = undefined;
          }
          return;
        }

        frameRef.current = requestAnimationFrame(callback);
        return frameRef.current;
      };

      // Execute the game code in a controlled environment
      // Note: Using _canvas and _ctx to avoid naming conflicts
      const executeGame = new Function("_canvas", "_ctx", "animate", "stop", `
        // Make canvas and ctx available to game code
        const canvas = _canvas;
        const ctx = _ctx;
        let animationFrameId;

        ${code}
      `);

      // Run the game with proper bindings
      executeGame(
        canvasElement,
        context,
        handleFrame,
        () => {
          if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
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
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);
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