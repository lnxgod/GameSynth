import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameCanvasProps {
  code: string;
  onDebugLog?: (log: string) => void;
}

export function GameCanvas({ code, onDebugLog }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  // Clean up function to stop the game
  const stopGame = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    setIsRunning(false);
    onDebugLog?.("🛑 Game stopped");
  };

  // Reset canvas
  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Global error handler for the game
  const handleGameError = (error: any) => {
    // Log the error details
    const errorDetails = {
      message: error.message || "Unknown error",
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    // Send to debug logs
    onDebugLog?.(`🚨 Error executing game code: ${JSON.stringify(errorDetails)}`);

    // Stop the game
    stopGame();

    // Show a user-friendly toast
    toast({
      title: "Game Error",
      description: "There was an error running the game. Check the debug logs for details.",
      variant: "destructive",
    });
  };

  // Start the game
  const startGame = () => {
    if (!code) {
      toast({
        title: "No Game Code",
        description: "Please generate some game code first.",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clean up any previous game state
    stopGame();
    resetCanvas();

    onDebugLog?.("🎮 Starting game...");
    onDebugLog?.(`📐 Canvas size: ${canvas.width}x${canvas.height}`);

    try {
      // Wrap game code in error handling
      const wrappedCode = `
        try {
          ${code}
        } catch (error) {
          throw new Error(JSON.stringify({
            message: error.message,
            stack: error.stack,
            line: error.lineNumber,
            column: error.columnNumber
          }));
        }
      `;

      // Create game function with error boundary
      const gameFunction = new Function("canvas", "ctx", "requestAnimationFrame", "cancelAnimationFrame", wrappedCode);

      // Set up error event listener
      window.addEventListener('error', handleGameError);

      // Run the game with error handling
      try {
        gameFunction(
          canvas,
          ctx,
          (callback: FrameRequestCallback) => {
            try {
              frameRef.current = requestAnimationFrame(callback);
              return frameRef.current;
            } catch (error) {
              handleGameError(error);
              return 0;
            }
          },
          (id: number) => {
            if (frameRef.current === id) {
              cancelAnimationFrame(id);
              frameRef.current = undefined;
            }
          }
        );

        setIsRunning(true);
        onDebugLog?.("✅ Game started successfully");
      } catch (error) {
        handleGameError(error);
      }
    } catch (error) {
      handleGameError(error);
    }
  };

  // Cleanup on unmount or code change
  useEffect(() => {
    // Remove error event listener on cleanup
    const cleanup = () => {
      window.removeEventListener('error', handleGameError);
      stopGame();
      resetCanvas();
    };

    return cleanup;
  }, [code]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex gap-2 justify-end">
          {!isRunning ? (
            <Button onClick={startGame} className="w-24">
              <Play className="mr-2 h-4 w-4" />
              Run
            </Button>
          ) : (
            <Button onClick={stopGame} variant="destructive" className="w-24">
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-[600px] border border-border rounded-md bg-black"
          style={{ aspectRatio: "4/3" }}
          onError={handleGameError}
        />
      </div>
    </Card>
  );
}