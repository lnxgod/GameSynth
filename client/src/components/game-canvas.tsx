import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GameCanvasProps {
  code: string;
  onDebugLog?: (log: string) => void;
}

const TEST_GAME = `
// Game variables
let x = canvas.width/2;
let y = canvas.height/2;
let dx = 2;
let dy = -2;
let radius = 20;

// Game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ball
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#0000FF";
  ctx.fill();
  ctx.closePath();

  // Move ball
  x += dx;
  y += dy;

  // Bounce off walls
  if(x + dx > canvas.width - radius || x + dx < radius) dx = -dx;
  if(y + dy > canvas.height - radius || y + dy < radius) dy = -dy;

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
`;

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

    // Test the execution environment with a simple bouncing ball if no code is provided
    const gameCode = code || TEST_GAME;
    onDebugLog?.(`Processing game code... (length: ${gameCode.length} characters)`);

    try {
      // Create a safe execution environment with game variables and proper error handling
      const wrappedCode = `
        let animationFrameId = null;
        let x, y, dx, dy, radius;  // Common game variables

        function wrapError(fn) {
          try {
            fn();
          } catch (error) {
            debug("Game error: " + error.message);
            throw error;
          }
        }

        wrapError(() => {
          ${gameCode}
        });
      `;

      const gameFunction = new Function(
        "canvas", 
        "ctx", 
        "debug", 
        "requestAnimationFrame", 
        "cancelAnimationFrame",
        wrappedCode
      );

      // Execute the game code with all necessary context
      gameFunction(
        canvas, 
        ctx, 
        onDebugLog,
        (callback: FrameRequestCallback) => {
          const id = requestAnimationFrame(callback);
          frameRef.current = id;
          return id;
        },
        cancelAnimationFrame.bind(window)
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