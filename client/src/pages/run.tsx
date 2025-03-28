import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { GameSandbox } from "@/components/game-sandbox";

// Empty placeholder with a message instead of a default game
const DEFAULT_GAME_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create a Game</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(to bottom, #1a1a1a, #2d2d2d);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .message {
      max-width: 600px;
      padding: 30px;
      border-radius: 12px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    h1 {
      margin-top: 0;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      margin-bottom: 24px;
      line-height: 1.6;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="message">
    <h1>No Game Found</h1>
    <p>
      It looks like there's no game code available to run. Please return to the editor
      and either create a new game or load a template first.
    </p>
  </div>
</body>
</html>`;

export default function RunPage() {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    // CRITICAL FIX: Don't use demo code, always use the user's game
    const sessionCode = sessionStorage.getItem('currentGameCode');
    const localCode = localStorage.getItem('gameCode');
    
    console.log('Run page loaded with session code:', sessionCode ? 'available' : 'not available');
    console.log('Local storage code:', localCode ? 'available' : 'not available');
    
    // IMPORTANT: Only use actual user code - never default to demo unless both storages are empty
    if (sessionCode) {
      setGameCode(sessionCode);
      console.log('Using session storage code, length:', sessionCode.length);
      
      // Keep both storages in sync
      localStorage.setItem('gameCode', sessionCode);
    } else if (localCode) {
      setGameCode(localCode);
      console.log('Using local storage code, length:', localCode.length);
      
      // Keep both storages in sync
      sessionStorage.setItem('currentGameCode', localCode);
    } else {
      // Only as absolute last resort when there is truly no code available
      console.log('WARNING: No user game found, using default code as fallback');
      setGameCode(DEFAULT_GAME_CODE);
    }
    
    // Auto-launch if we have code
    setTimeout(() => {
      if (sessionCode || localCode) {
        handleRunGame();
      }
    }, 500);
  }, []);

  const handleRunGame = () => {
    if (!gameCode) return;
    setIsLaunching(true);
    
    // Add a small delay to show the loading animation
    setTimeout(() => {
      setShowGame(true);
      setFullscreen(true);
    }, 800); // Delay for visual effect
  };

  const handleCloseGame = () => {
    setShowGame(false);
    setIsLaunching(false);
    setFullscreen(false);
  };

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-background' : 'container py-8'} transition-all duration-300`}>
      {/* Only show back button when not in fullscreen mode */}
      {!fullscreen && (
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="outline" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Design
            </Button>
          </Link>
        </div>
      )}
      
      {/* Loading animation during transition */}
      {isLaunching && !showGame && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-secondary rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-medium mb-2">Preparing Game Environment</h3>
          <p className="text-muted-foreground">Loading assets and initializing game...</p>
        </div>
      )}
      
      {/* Game sandbox */}
      {showGame ? (
        <GameSandbox 
          gameCode={gameCode}
          onClose={handleCloseGame}
          showCode={false}
          fullscreen={fullscreen}
        />
      ) : (
        !isLaunching && (
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
                  <Play className="mr-2 h-4 w-4" />
                  Launch Game
                </Button>
                {!gameCode && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No game found. Create a game first in the editor.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}