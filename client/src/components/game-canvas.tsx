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
    onDebugLog?.("Preparing game code execution environment...");

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

      // Create the game execution wrapper
      const wrappedCode = `
        return (function(canvasObj, contextObj) {
          // Debug the execution environment
          if (!canvasObj || !contextObj) {
            throw new Error('Canvas context initialization failed');
          }

          // Game state management
          let __gameState = {
            frameId: null,
            isRunning: false
          };

          // Inject canvas and context without declaring new variables
          Object.defineProperties(window, {
            canvas: {
              value: canvasObj,
              writable: false
            },
            ctx: {
              value: contextObj,
              writable: false
            }
          });

          try {
            ${code}
          } catch (error) {
            throw new Error('Game code execution failed: ' + error.message);
          }

          return __gameState;
        })`;

      onDebugLog?.("Executing game code with following setup:");
      onDebugLog?.("Canvas dimensions: " + canvasElement.width + "x" + canvasElement.height);

      // Create and execute the game function
      const gameFunction = new Function(wrappedCode);
      const gameInstance = gameFunction();

      // Execute the game with proper context
      gameInstance(canvasElement, context);

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