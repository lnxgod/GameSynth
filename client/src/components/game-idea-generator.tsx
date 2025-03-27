// Game Idea Generator Component
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from './ui/spinner';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface GameIdea {
  title: string;
  description: string;
  mainCharacter: string;
  setting: string;
  mechanics: string;
  twist: string;
}

export function GameIdeaGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameIdea, setGameIdea] = useState<GameIdea | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateGameIdea = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Direct API request to the dedicated game idea endpoint
      const response = await apiRequest('POST', '/api/game-idea');
      
      console.log("Game idea generated:", response);
      
      if (!response) {
        throw new Error('Invalid response from the server');
      }
      
      // Set the game idea directly from the response as GameIdea
      setGameIdea(response as GameIdea);
    } catch (error) {
      console.error('Error generating game idea:', error);
      setError('Could not generate a game idea. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/>
            <path d="M19 17v4"/>
            <path d="M3 5h4"/>
            <path d="M17 19h4"/>
          </svg>
          Game Idea Generator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>AI Game Idea Generator</span>
            <Badge variant="outline" className="ml-2">Whimsical Themes</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!gameIdea && !isGenerating && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-6">
                Click below to generate a whimsical game idea with our AI assistant!
              </p>
              <Button onClick={generateGameIdea} disabled={isGenerating}>
                Generate Game Idea
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner size="lg" />
              <p className="mt-4 text-muted-foreground">Conjuring whimsical game ideas...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 p-4 rounded-md">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-2" onClick={() => setError(null)}>
                Try Again
              </Button>
            </div>
          )}

          {gameIdea && (
            <Card className="p-4 border-2 border-primary/20 bg-primary/5">
              <h3 className="text-xl font-bold mb-2">{gameIdea.title}</h3>
              <p className="mb-4">{gameIdea.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-primary">Main Character</h4>
                  <p className="text-sm">{gameIdea.mainCharacter}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Setting</h4>
                  <p className="text-sm">{gameIdea.setting}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold text-primary">Game Mechanics</h4>
                <p className="text-sm">{gameIdea.mechanics}</p>
              </div>
              
              <div className="mt-4 p-3 bg-secondary/10 rounded-md">
                <h4 className="font-semibold text-secondary">Unique Twist</h4>
                <p className="text-sm">{gameIdea.twist}</p>
              </div>
              
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setGameIdea(null)}>
                  Clear
                </Button>
                <Button onClick={generateGameIdea} disabled={isGenerating}>
                  Generate New Idea
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}