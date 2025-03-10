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

const questions = [
  {
    id: 'gameType',
    question: 'What type of game would you like to create?',
    placeholder: 'e.g., Platformer, Puzzle, Arcade, Space Shooter',
    type: 'input'
  },
  {
    id: 'mechanics',
    question: 'What are the main gameplay mechanics?',
    placeholder: 'Describe how the game will be played',
    type: 'textarea'
  },
  {
    id: 'visualStyle',
    question: 'What visual style would you like for your game?',
    placeholder: 'e.g., Minimalist, Retro, Colorful, Abstract',
    type: 'input'
  },
  {
    id: 'difficulty',
    question: 'What difficulty level should the game have?',
    placeholder: 'e.g., Easy, Medium, Hard, Progressive',
    type: 'input'
  },
  {
    id: 'specialFeatures',
    question: 'Are there any special features you would like to include?',
    placeholder: 'Any unique mechanics or elements that make your game special',
    type: 'textarea'
  }
];

export function GameDesignAssistant({ onCodeGenerated }: GameDesignAssistantProps) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [requirements, setRequirements] = useState<GameRequirements>({
    gameType: "",
    mechanics: "",
    visualStyle: "",
    difficulty: "",
    specialFeatures: ""
  });
  const [showFinalPrompt, setShowFinalPrompt] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([]);
  const { toast } = useToast();

  const thinkMutation = useMutation({
    mutationFn: async () => {
      const prompt = generateFinalPrompt();
      const res = await apiRequest('POST', '/api/design/chat', {
        message: prompt,
        sessionId
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(data.history);
      if (data.needsMoreInfo) {
        toast({
          title: "More Information Needed",
          description: data.message,
        });
      } else {
        toast({
          title: "Ready to Generate",
          description: "Requirements are sufficient to create your game!",
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

  const generateMutation = useMutation({
    mutationFn: async () => {
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

  const generateFinalPrompt = () => {
    return `
Game Design Requirements:

1. Game Type: ${requirements.gameType}
2. Core Mechanics: ${requirements.mechanics}
3. Visual Style: ${requirements.visualStyle}
4. Difficulty Level: ${requirements.difficulty}
5. Special Features: ${requirements.specialFeatures}

Please create an HTML5 Canvas game with these specifications. The game should be engaging, well-commented, and implement all the requested features while maintaining good performance and clean code structure.
    `.trim();
  };

  const handleAnswer = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setRequirements(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowFinalPrompt(true);
    }
  };

  const handleBack = () => {
    if (showFinalPrompt) {
      setShowFinalPrompt(false);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Game Design Assistant</h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Prompt</h3>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {generateFinalPrompt()}
              </pre>
            </ScrollArea>
          </div>

          {!showFinalPrompt ? (
            <div className="space-y-4">
              <div className="text-lg mb-2">{currentQuestion.question}</div>

              {currentQuestion.type === 'textarea' ? (
                <Textarea
                  placeholder={currentQuestion.placeholder}
                  value={requirements[currentQuestion.id as keyof GameRequirements]}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="min-h-[100px]"
                />
              ) : (
                <Input
                  placeholder={currentQuestion.placeholder}
                  value={requirements[currentQuestion.id as keyof GameRequirements]}
                  onChange={(e) => handleAnswer(e.target.value)}
                />
              )}

              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentQuestionIndex === 0}
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!requirements[currentQuestion.id as keyof GameRequirements].trim()}
                >
                  {currentQuestionIndex === questions.length - 1 ? "Review" : "Next"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Final Review</h3>

              <div className="flex justify-between mt-4 space-x-4">
                <Button variant="outline" onClick={handleBack}>
                  Edit Answers
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => thinkMutation.mutate()}
                  disabled={thinkMutation.isPending}
                >
                  {thinkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Think About It
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => generateMutation.mutate()}
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
                      Force Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

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