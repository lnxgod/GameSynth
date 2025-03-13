import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { gameEvents } from "@/lib/EventManager";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GameCanvasProps {
  code: string;
  onDebugLog?: (log: string) => void;
  onCodeUpdate?: (code: string) => void;
  gameDesign?: any;
}

export function GameCanvas({ code, onDebugLog, onCodeUpdate, gameDesign }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const sandboxRef = useRef<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showRemixChat, setShowRemixChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const { toast } = useToast();

  // Clean up function to stop the game
  const stopGame = () => {
    try {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }

      // Clear all event listeners
      gameEvents.clear();
      gameEvents.disable();

      // Clear sandbox
      if (sandboxRef.current) {
        // Clean up any global objects created by the game
        Object.keys(sandboxRef.current).forEach(key => {
          delete sandboxRef.current[key];
        });
        sandboxRef.current = null;
      }

      setIsRunning(false);
      onDebugLog?.("🛑 Game stopped");
    } catch (error) {
      console.error("Error stopping game:", error);
    }
  };

  // Reset canvas
  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const remixMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/code/chat", {
        code,
        message,
        gameDesign,
        type: "remix"
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.updatedCode) {
        onDebugLog?.("🎮 Game code remixed successfully");
        if (onCodeUpdate) {
          onCodeUpdate(data.updatedCode);
        }
        toast({
          title: "Game Remixed",
          description: "The game code has been updated with your suggestions",
        });
        setShowRemixChat(false);
        setChatMessage("");
        stopGame();
        startGame();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remix game code",
        variant: "destructive",
      });
    }
  });

  // Global error handler for the game
  const handleGameError = (error: any) => {
    const errorDetails = {
      message: error.message || "Unknown error",
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    onDebugLog?.(`🚨 Error executing game code: ${JSON.stringify(errorDetails)}`);
    stopGame();

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
    gameEvents.enable(); // Enable event system for new game

    onDebugLog?.("🎮 Starting game...");
    onDebugLog?.(`📐 Canvas size: ${canvas.width}x${canvas.height}`);

    try {
      // Create a fresh sandbox for each game instance
      sandboxRef.current = {
        // Canvas-related
        canvas,
        ctx,
        // Animation frame handling
        requestAnimationFrame: (callback: FrameRequestCallback) => {
          frameRef.current = requestAnimationFrame(callback);
          return frameRef.current;
        },
        cancelAnimationFrame: (id: number) => {
          if (frameRef.current === id) {
            cancelAnimationFrame(id);
            frameRef.current = undefined;
          }
        },
        // Event handling functions
        document: {
          addEventListener: (event: string, callback: Function) => {
            gameEvents.on(event, callback);
          },
          removeEventListener: (event: string, callback: Function) => {
            gameEvents.off(event, callback);
          }
        },
        window: {
          addEventListener: (event: string, callback: Function) => {
            gameEvents.on(event, callback);
          },
          removeEventListener: (event: string, callback: Function) => {
            gameEvents.off(event, callback);
          },
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight
        },
        // Custom event system
        gameEvents: {
          on: (event: string, callback: Function) => gameEvents.on(event, callback),
          off: (event: string, callback: Function) => gameEvents.off(event, callback),
          once: (event: string, callback: Function) => gameEvents.once(event, callback),
          emit: (event: string, ...args: any[]) => gameEvents.emit(event, ...args)
        },
        // Utility functions
        Math: Math,
        Date: Date,
        console: {
          log: (...args: any[]) => {
            console.log('[Game]:', ...args);
            onDebugLog?.(`📝 Game Log: ${args.join(' ')}`);
          },
          error: (...args: any[]) => {
            console.error('[Game Error]:', ...args);
            onDebugLog?.(`❌ Game Error: ${args.join(' ')}`);
          }
        }
      };

      // Wrap game code in error handling and provide the sandboxed environment
      const wrappedCode = `
        "use strict";
        try {
          const { canvas, ctx, document, window, gameEvents, requestAnimationFrame, cancelAnimationFrame, Math, Date, console } = gameEnv;
          // Wrap the game code in an IIFE to avoid global scope pollution
          (function() {
            ${code}
          })();
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
      const gameFunction = new Function("gameEnv", wrappedCode);

      // Set up error event listener
      window.addEventListener('error', handleGameError);

      // Run the game with error handling
      try {
        gameFunction(sandboxRef.current);
        setIsRunning(true);
        onDebugLog?.("✅ Game started successfully");
      } catch (error) {
        handleGameError(error);
      }
    } catch (error) {
      handleGameError(error);
    }
  };

  const handleRemix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    remixMutation.mutate(chatMessage);
  };

  // Cleanup on unmount or code change
  useEffect(() => {
    return () => {
      stopGame();
      resetCanvas();
      window.removeEventListener('error', handleGameError);
    };
  }, [code]);

  return (
    <Card className="w-full">
      <div className="p-4 space-y-4">
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
          <Button
            onClick={() => setShowRemixChat(!showRemixChat)}
            variant="secondary"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Remix
          </Button>
        </div>

        <div className="flex gap-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-[600px] border border-border rounded-md bg-black"
            style={{ aspectRatio: "4/3" }}
          />

          {showRemixChat && (
            <Card className="w-96 p-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  <h3 className="font-semibold">Remix Game</h3>
                  <p className="text-sm text-muted-foreground">
                    Describe how you'd like to modify the game. For example:
                    "Add power-ups", "Make the game faster", or "Change the colors".
                  </p>
                  <form onSubmit={handleRemix} className="space-y-4">
                    <Textarea
                      placeholder="What would you like to change?"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={remixMutation.isPending}
                    >
                      {remixMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Remixing...
                        </>
                      ) : (
                        "Apply Changes"
                      )}
                    </Button>
                  </form>
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    </Card>
  );
}