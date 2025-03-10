import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GameDesignAssistantProps {
  onCodeGenerated: (code: string) => void;
}

interface GameRequirements {
  gameType: string;
  mechanics: string;
  visualStyle: string;
  difficulty: string;
  specialFeatures: string;
}

export function GameDesignAssistant({ onCodeGenerated }: GameDesignAssistantProps) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [requirements, setRequirements] = useState<GameRequirements>({
    gameType: "",
    mechanics: "",
    visualStyle: "",
    difficulty: "",
    specialFeatures: ""
  });
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([]);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      // First, send the requirements to get assistant feedback
      const prompt = `
Game Type: ${requirements.gameType}
Core Mechanics: ${requirements.mechanics}
Visual Style: ${requirements.visualStyle}
Difficulty Level: ${requirements.difficulty}
Special Features: ${requirements.specialFeatures}
      `.trim();

      const chatRes = await apiRequest('POST', '/api/design/chat', {
        message: prompt,
        sessionId
      });
      const chatData = await chatRes.json();
      setMessages(chatData.history);

      // Then generate the code
      const res = await apiRequest('POST', '/api/design/generate', {
        sessionId
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.code) {
        onCodeGenerated(data.code);
        toast({
          title: "Success",
          description: "Game code has been generated based on your requirements!",
        });
      } else {
        toast({
          title: "Warning",
          description: "No code was generated. Try refining your game requirements.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(requirements).some(value => !value.trim())) {
      toast({
        title: "Missing Requirements",
        description: "Please fill out all fields before generating code.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Game Design Requirements</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Game Type</label>
                <Input
                  placeholder="e.g., Platformer, Puzzle, Arcade, Space Shooter"
                  value={requirements.gameType}
                  onChange={(e) => setRequirements(prev => ({ ...prev, gameType: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Core Mechanics</label>
                <Textarea
                  placeholder="Describe the main gameplay mechanics"
                  value={requirements.mechanics}
                  onChange={(e) => setRequirements(prev => ({ ...prev, mechanics: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Visual Style</label>
                <Input
                  placeholder="e.g., Minimalist, Retro, Colorful, Abstract"
                  value={requirements.visualStyle}
                  onChange={(e) => setRequirements(prev => ({ ...prev, visualStyle: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Difficulty Level</label>
                <Input
                  placeholder="e.g., Easy, Medium, Hard, Progressive"
                  value={requirements.difficulty}
                  onChange={(e) => setRequirements(prev => ({ ...prev, difficulty: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Special Features</label>
                <Textarea
                  placeholder="Any special features or mechanics you'd like to include"
                  value={requirements.specialFeatures}
                  onChange={(e) => setRequirements(prev => ({ ...prev, specialFeatures: e.target.value }))}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Game
                </>
              )}
            </Button>
          </form>

          {messages.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Design Process</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'assistant' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'assistant'
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}