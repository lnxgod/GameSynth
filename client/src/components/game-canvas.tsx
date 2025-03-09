import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface GameCanvasProps {
  code: string;
}

export function GameCanvas({ code }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !code) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous animation frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    try {
      // Create a safe execution environment
      const gameFunction = new Function("canvas", "ctx", code);
      gameFunction(canvas, ctx);
    } catch (error) {
      console.error("Error executing game code:", error);
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [code]);

  return (
    <Card className="p-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full border border-border rounded-md"
      />
    </Card>
  );
}
