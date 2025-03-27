import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { GameSandbox } from "@/components/game-sandbox";

// Default game code in case nothing is saved
const DEFAULT_GAME_CODE = `
// Simple bouncing ball game
let x = 400;
let y = 300;
let dx = 5;
let dy = 5;
let radius = 25;

// Game animation loop
function animate() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw ball
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#4CAF50";
  ctx.fill();
  ctx.closePath();
  
  // Bounce off walls
  if (x + dx > canvas.width - radius || x + dx < radius) {
    dx = -dx;
  }
  if (y + dy > canvas.height - radius || y + dy < radius) {
    dy = -dy;
  }
  
  // Move ball
  x += dx;
  y += dy;
  
  // Continue animation
  requestAnimationFrame(animate);
}

// Start game
animate();
`;

export default function RunPage() {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    // Get the game code from localStorage
    const savedCode = localStorage.getItem('currentGameCode');
    if (savedCode) {
      setGameCode(savedCode);
    } else {
      // Use default game code if none is available
      setGameCode(DEFAULT_GAME_CODE);
    }
  }, []);

  const handleRunGame = () => {
    if (!gameCode) return;
    setIsLaunching(true);
    setShowGame(true);
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
        <GameSandbox 
          gameCode={gameCode}
          onClose={handleCloseGame}
          showCode={true}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Run Game</CardTitle>
          </CardHeader>
          <CardContent>
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
              {!gameCode && (
                <p className="mt-4 text-sm text-muted-foreground">
                  A default demo game will be loaded
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}