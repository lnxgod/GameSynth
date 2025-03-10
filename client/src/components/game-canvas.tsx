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
    onDebugLog?.("Game stopped");
  };

  // Reset canvas
  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
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

    onDebugLog?.("Starting game...");
    onDebugLog?.(`Canvas size: ${canvas.width}x${canvas.height}`);

    try {
      // Create game function
      const gameFunction = new Function("canvas", "ctx", "requestAnimationFrame", "cancelAnimationFrame", code);

      // Run the game
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

      setIsRunning(true);
      onDebugLog?.("Game started successfully");
    } catch (error) {
      console.error("Error executing game code:", error);
      onDebugLog?.(`Error executing game code: ${error}`);

      toast({
        title: "Game Error",
        description: "There was an error running the game. Check the debug logs for details.",
        variant: "destructive",
      });
    }
  };

  // Cleanup on unmount or code change
  useEffect(() => {
    return () => {
      stopGame();
      resetCanvas();
    };
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
        />
      </div>
    </Card>
  );
}