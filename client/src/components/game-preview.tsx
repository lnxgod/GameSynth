import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GamePreviewProps {
  code: string;
  onDebugLog?: (log: string) => void;
  onCodeUpdate?: (code: string) => void;
  gameDesign?: any;
}

export function GamePreview({ code, onDebugLog, onCodeUpdate, gameDesign }: GamePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showRemixChat, setShowRemixChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const { toast } = useToast();

  const generateGameHTML = (gameCode: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; overflow: hidden; background: black; }
            canvas { 
              display: block;
              width: 100vw !important;
              height: 100vh !important;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <canvas id="gameCanvas"></canvas>
          <script>
            // Wrap game code in module to avoid global scope pollution
            (function() {
              const canvas = document.getElementById('gameCanvas');
              const ctx = canvas.getContext('2d');
              
              // Set canvas size to match window
              function resizeCanvas() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
              }
              resizeCanvas();
              window.addEventListener('resize', resizeCanvas);

              // Game specific code
              ${gameCode}

              // Error handling
              window.onerror = function(msg, url, lineNo, columnNo, error) {
                window.parent.postMessage({
                  type: 'error',
                  error: { message: msg, stack: error?.stack }
                }, '*');
                return false;
              };

              // Log interceptor
              const originalConsole = { ...console };
              console.log = (...args) => {
                originalConsole.log(...args);
                window.parent.postMessage({
                  type: 'log',
                  message: args.join(' ')
                }, '*');
              };
              console.error = (...args) => {
                originalConsole.error(...args);
                window.parent.postMessage({
                  type: 'error',
                  message: args.join(' ')
                }, '*');
              };
            })();
          </script>
        </body>
      </html>
    `;
  };

  const startGame = () => {
    if (!code) {
      toast({
        title: "No Game Code",
        description: "Please generate some game code first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // Write the game HTML to the iframe
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      iframeDoc.open();
      iframeDoc.write(generateGameHTML(code));
      iframeDoc.close();

      setIsRunning(true);
      onDebugLog?.("🎮 Game started successfully");
    } catch (error: any) {
      handleError(error);
    }
  };

  const stopGame = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // Clear the iframe
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      iframeDoc.open();
      iframeDoc.write('');
      iframeDoc.close();

      setIsRunning(false);
      onDebugLog?.("🛑 Game stopped");
    } catch (error: any) {
      console.error("Error stopping game:", error);
    }
  };

  const handleError = (error: any) => {
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

  const handleRemix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    remixMutation.mutate(chatMessage);
  };

  useEffect(() => {
    // Handle messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'error') {
        handleError(event.data.error);
      } else if (event.data.type === 'log') {
        onDebugLog?.(event.data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      stopGame();
    };
  }, []);

  // Cleanup on unmount or code change
  useEffect(() => {
    return () => {
      stopGame();
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
          <div className="flex-1 relative aspect-video">
            <iframe
              ref={iframeRef}
              className="w-full h-full border border-border rounded-md bg-black"
              sandbox="allow-scripts"
            />
          </div>

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
