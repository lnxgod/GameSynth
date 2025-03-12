import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameCanvas } from "@/components/game-canvas";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function RunPage() {
  const { auth } = useAuth();
  const [gameCode, setGameCode] = useState<string | null>(null);

  useEffect(() => {
    // Get the game code from localStorage
    const savedCode = localStorage.getItem('currentGameCode');
    if (savedCode) {
      setGameCode(savedCode);
    }
  }, []);

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
            <GameCanvas code={gameCode} />
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