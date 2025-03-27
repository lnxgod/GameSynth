import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function RunPage() {
  const [gameCode, setGameCode] = useState<string | null>(null);

  useEffect(() => {
    // Get the game code from localStorage
    const savedCode = localStorage.getItem('currentGameCode');
    if (savedCode) {
      setGameCode(savedCode);
    }
  }, []);

  const handleRunGame = () => {
    if (!gameCode) return;

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
          </style>
        </head>
        <body>
          <canvas id="gameCanvas"></canvas>
          <script>
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size to window size
            function resizeCanvas() {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
            }
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            // Run the game code
            ${gameCode}
          </script>
        </body>
      </html>
    `;

    // Create a blob and generate URL
    const blob = new Blob([gameHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Open in new window
    const gameWindow = window.open(url, '_blank');

    // Clean up the URL object after the window is loaded
    if (gameWindow) {
      gameWindow.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
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
                className="w-full max-w-sm"
              >
                Launch Game in New Window
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
    </div>
  );
}