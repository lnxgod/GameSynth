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

interface AnalyzedAspect {
  analysis: string;
  implementation_details: string[];
  technical_considerations: string[];
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
  const [analyses, setAnalyses] = useState<Partial<Record<keyof GameRequirements, AnalyzedAspect>>>({});
  const [showFinalPrompt, setShowFinalPrompt] = useState(false);
  const [finalDesign, setFinalDesign] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState<number>(-1);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (aspect: keyof GameRequirements) => {
      const res = await apiRequest('POST', '/api/design/analyze', {
        aspect,
        content: requirements[aspect],
        sessionId
      });
      return res.json();
    },
    onSuccess: (data, aspect) => {
      setAnalyses(prev => ({
        ...prev,
        [aspect]: data
      }));
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/finalize', {
        sessionId
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(data.history);
      setFinalDesign(data);
      if (data.needsMoreInfo) {
        setFollowUpQuestions(data.additionalQuestions.slice(0, 3));
        setCurrentFollowUpIndex(0);
        setShowFollowUp(true);
        toast({
          title: "Additional Information Needed",
          description: "Let's answer some follow-up questions to refine the game design.",
        });
      } else {
        toast({
          title: "Design Ready",
          description: "Game design is complete and ready for implementation!",
        });
      }
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/generate', {
        sessionId,
        followUpAnswers,
        analyses: Object.fromEntries(
          Object.entries(analyses).map(([key, value]) => [
            key,
            {
              analysis: value?.analysis,
              implementation_details: value?.implementation_details,
              technical_considerations: value?.technical_considerations
            }
          ])
        )
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.code) {
        onCodeGenerated(data.code);
        toast({
          title: "Success",
          description: "Game code has been generated!",
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

  const handleAnswer = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setRequirements(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleFollowUpAnswer = (value: string) => {
    if (currentFollowUpIndex >= 0 && currentFollowUpIndex < followUpQuestions.length) {
      setFollowUpAnswers(prev => ({
        ...prev,
        [followUpQuestions[currentFollowUpIndex]]: value
      }));
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowFinalPrompt(true);
    }
  };

  const handleNextFollowUp = () => {
    if (currentFollowUpIndex < followUpQuestions.length - 1) {
      setCurrentFollowUpIndex(prev => prev + 1);
    } else {
      setShowFollowUp(false);
      finalizeMutation.mutate(); 
    }
  };

  const handleBack = () => {
    if (showFollowUp) {
      if (currentFollowUpIndex > 0) {
        setCurrentFollowUpIndex(prev => prev - 1);
      } else {
        setShowFollowUp(false);
      }
    } else if (showFinalPrompt) {
      setShowFinalPrompt(false);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleThink = async () => {
    for (const question of questions) {
      const aspect = question.id as keyof GameRequirements;
      await analyzeMutation.mutateAsync(aspect);
    }
    await finalizeMutation.mutateAsync();
  };

  const currentQuestion = questions[currentQuestionIndex];

  const renderCurrentPrompt = () => {
    if (finalDesign) {
      return (
        <div className="space-y-4">
          <div className="font-semibold">Final Game Design:</div>
          <div>{finalDesign.gameDescription}</div>

          <div className="font-semibold">Core Mechanics:</div>
          <ul className="list-disc pl-4">
            {finalDesign.coreMechanics.map((mechanic: string, index: number) => (
              <li key={index}>{mechanic}</li>
            ))}
          </ul>

          <div className="font-semibold">Technical Requirements:</div>
          <ul className="list-disc pl-4">
            {finalDesign.technicalRequirements.map((req: string, index: number) => (
              <li key={index}>{req}</li>
            ))}
          </ul>

          <div className="font-semibold">Implementation Approach:</div>
          <div>{finalDesign.implementationApproach}</div>

          {Object.entries(followUpAnswers).length > 0 && (
            <>
              <div className="font-semibold">Additional Details:</div>
              <ul className="list-disc pl-4">
                {Object.entries(followUpAnswers).map(([question, answer], index) => (
                  <li key={index}>
                    <span className="font-medium">{question}</span>: {answer}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(requirements).map(([aspect, value]) => {
          const analysis = analyses[aspect as keyof GameRequirements];
          return (
            <div key={aspect} className="space-y-2">
              <div className="font-semibold capitalize">{aspect}:</div>
              <div>{value}</div>
              {analysis && (
                <>
                  <div className="text-sm text-muted-foreground">{analysis.analysis}</div>
                  {analysis.implementation_details.length > 0 && (
                    <ul className="list-disc pl-4 text-sm">
                      {analysis.implementation_details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Game Design Assistant</h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Design</h3>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              {renderCurrentPrompt()}
            </ScrollArea>
          </div>

          {!showFinalPrompt && !showFollowUp ? (
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
          ) : showFollowUp ? (
            <div className="space-y-4">
              <div className="text-lg mb-2">{followUpQuestions[currentFollowUpIndex]}</div>

              <Textarea
                placeholder="Enter your answer..."
                value={followUpAnswers[followUpQuestions[currentFollowUpIndex]] || ""}
                onChange={(e) => handleFollowUpAnswer(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentFollowUpIndex === 0}
                >
                  Back
                </Button>
                <Button
                  onClick={handleNextFollowUp}
                  disabled={!followUpAnswers[followUpQuestions[currentFollowUpIndex]]?.trim()}
                >
                  {currentFollowUpIndex === followUpQuestions.length - 1 ? "Finish" : "Next"}
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
                  onClick={handleThink}
                  disabled={analyzeMutation.isPending || finalizeMutation.isPending}
                >
                  {analyzeMutation.isPending || finalizeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Think About It
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => finalizeMutation.mutate()}
                  disabled={finalizeMutation.isPending}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Follow Up
                </Button>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Building...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Build It
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