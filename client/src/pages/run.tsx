import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Play } from "lucide-react";

export default function RunPage() {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    // Get the game code from localStorage
    const savedCode = localStorage.getItem('currentGameCode');
    if (savedCode) {
      setGameCode(savedCode);
    }
  }, []);

  const handleRunGame = () => {
    if (!gameCode) return;

    setIsLaunching(true);
    setShowGame(true);

    // Create an HTML document that includes the game code
    const gameHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Game Preview</title>
          <style>
            body { margin: 0; overflow: hidden; background: #000; }
            canvas { 
              display: block;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }
            .loading {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: #000;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-family: system-ui, sans-serif;
              opacity: 1;
              transition: opacity 0.5s ease;
            }
            .loading.fade-out {
              opacity: 0;
            }
          </style>
        </head>
        <body>
          <div id="loading" class="loading">
            <div style="text-align: center;">
              <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
              <p>Loading game...</p>
            </div>
          </div>
          <canvas id="gameCanvas"></canvas>
          <script>
            // Spinner animation
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }

            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            const loading = document.getElementById('loading');

            // Set canvas size to window size
            function resizeCanvas() {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
            }
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            // Remove loading screen once game is ready
            window.addEventListener('load', () => {
              setTimeout(() => {
                loading.classList.add('fade-out');
                setTimeout(() => {
                  loading.remove();
                }, 500);
              }, 1000);
            });

            // Run the game code
            ${gameCode}
          </script>
        </body>
      </html>
    `;

    // Create a blob and generate URL
    const blob = new Blob([gameHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Set the iframe src
    const iframe = document.getElementById('gameFrame') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = url;

      // Clean up URL after iframe loads
      iframe.onload = () => {
        URL.revokeObjectURL(url);
        setIsLaunching(false);
      };
    }
  };

  const handleCloseGame = () => {
    setShowGame(false);
    setIsLaunching(false);
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Button variant="outline" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Design
          </Button>
        </Link>
      </div>
      {showGame ? (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="text-lg font-semibold">Game Preview</h2>
            <Button variant="outline" onClick={handleCloseGame}>
              Close Preview
            </Button>
          </div>
          <div className="flex-1 relative">
            <iframe
              id="gameFrame"
              className="w-full h-full border-0"
              title="Game Preview"
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Run Game</CardTitle>
          </CardHeader>
          <CardContent>
            {gameCode ? (
              <div className="text-center">
                <Button 
                  onClick={handleRunGame}
                  size="lg"
                  className="w-full max-w-sm relative"
                  disabled={isLaunching}
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Launching Game...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Launch Game
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center p-4">
                <p>No game code available. Please generate or load a game first.</p>
                <Link href="/">
                  <Button className="mt-4">
                    Go to Game Designer
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}