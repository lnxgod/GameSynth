import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { GameSandbox } from "@/components/game-sandbox";

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