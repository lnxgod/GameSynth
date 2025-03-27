import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Play, Settings, Sparkles } from "lucide-react";
import { GameSandbox } from "@/components/game-sandbox";
import { GameIdeaGenerator } from "@/components/game-idea-generator";

export function NavBar() {
  const [showGamePreview, setShowGamePreview] = useState(false);
  
  const handleRunGame = () => {
    const gameCode = localStorage.getItem('currentGameCode');
    if (!gameCode) {
      alert("No game code available. Please generate or load a game first.");
      return;
    }
    setShowGamePreview(true);
  };

  const handleCloseGamePreview = () => {
    setShowGamePreview(false);
  };

  return (
    <>
      <nav className="border-b bg-background">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-lg font-bold">Game Dev Platform</span>
            </Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <Link href="/prompts-setup">
              <Button variant="ghost">
                <Settings className="mr-2 h-4 w-4" />
                Prompts Setup
              </Button>
            </Link>
            <GameIdeaGenerator />
            <Button variant="ghost" onClick={handleRunGame}>
              <Play className="mr-2 h-4 w-4" />
              Run Game
            </Button>
          </div>
        </div>
      </nav>
      
      {showGamePreview && (
        <GameSandbox 
          gameCode={localStorage.getItem('currentGameCode')}
          onClose={handleCloseGamePreview}
        />
      )}
    </>
  );
}