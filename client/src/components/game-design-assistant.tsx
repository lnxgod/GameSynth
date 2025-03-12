import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, ListPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ModelConfig, type ModelConfig as ModelConfigType } from "./model-config";
import { GraphicsGenerator } from "./graphics-generator";

interface GameDesignAssistantProps {
  onCodeGenerated: (code: string) => void;
  onDesignGenerated: (design: any) => void;
  onFeaturesGenerated: (features: string[]) => void;
  onGraphicsGenerated?: (graphics: any[]) => void;
  debugContext?: string;
  onAiOperation?: (op: { type: string; active: boolean }) => void;
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

export function GameDesignAssistant({
  onCodeGenerated,
  onDesignGenerated,
  onFeaturesGenerated,
  onGraphicsGenerated,
  debugContext,
  onAiOperation
}: GameDesignAssistantProps) {
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
  const [generatedFeatures, setGeneratedFeatures] = useState<string[]>([]);
  const { toast } = useToast();
  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    model: "o3-mini",
    temperature: 0.7,
    reasoning_effort: "medium"
  });
  const [generationPrompt, setGenerationPrompt] = useState<string>("");

  const analyzeModelMutation = useMutation({
    mutationFn: async ({ requirements, sessionId }) => {
      const res = await apiRequest('POST', '/api/design/analyze', {
        requirements,
        sessionId
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to analyze design');
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.analysis) {
        setAnalyses(prev => ({
          ...prev,
          ...data.analysis
        }));

        if (data.needsMoreInfo) {
          setFollowUpQuestions(data.additionalQuestions || []);
          setCurrentFollowUpIndex(0);
          setShowFollowUp(true);
          toast({
            title: "Additional Information Needed",
            description: "Let's answer some follow-up questions to refine the game design.",
          });
        } else {
          toast({
            title: "Design Analysis Complete",
            description: "Game design has been analyzed successfully!",
          });
          finalizeMutation.mutate();
        }
      }
      onAiOperation?.({ type: '', active: false });
    },
    onError: (error: any) => {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze design requirements",
        variant: "destructive",
      });
      onAiOperation?.({ type: '', active: false });
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
      onDesignGenerated(data);
    }
  });

  const generateFeaturesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/generate-features', {
        gameDesign: finalDesign,
        currentFeatures: generatedFeatures
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedFeatures([...generatedFeatures, ...data.features]);
      onFeaturesGenerated([...generatedFeatures, ...data.features]);
      toast({
        title: "Features Generated",
        description: `Added ${data.features.length} new features to the game design.`,
      });
    }
  });

  const generateMutation = useMutation({
    mutationFn: async ({modelConfig}) => {
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
        ),
        modelConfig,
        generationPrompt
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
      onDesignGenerated(data);
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
    setShowFollowUp(false);
    finalizeMutation.mutate();
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

  const handleThink = () => {
    onAiOperation?.({ type: 'Analyzing Game Design...', active: true });

    analyzeModelMutation.mutate({
      requirements,
      sessionId
    });
  };

  const fillDemoValues = () => {
    setRequirements({
      gameType: "Arcade",
      mechanics: "Frogger-style gameplay where player needs to navigate through obstacles. Player can collect power-ups that provide temporary abilities like invincibility or speed boost.",
      visualStyle: "16-bit retro graphics with bright colors and smooth animations",
      difficulty: "Medium - Progressive difficulty increase as levels advance",
      specialFeatures: "Power-up system including speed boost, invincibility, and extra lives. Score multiplier system based on consecutive successful moves."
    });
    setCurrentQuestionIndex(questions.length - 1);
    setShowFinalPrompt(true);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleBuildGame = () => {
    if (!analyses || Object.keys(analyses).length === 0) {
      toast({
        title: "Error",
        description: "Please analyze the game design first before building.",
        variant: "destructive"
      });
      return;
    }
    generateMutation.mutate({ modelConfig });
  };

  useEffect(() => {
    if (finalDesign) {
      const defaultPrompt = `Based on these game requirements and our discussion, create a complete HTML5 Canvas game implementation:

Game Description:
${finalDesign.gameDescription}

Core Mechanics:
${finalDesign.coreMechanics.join("\n")}

Technical Requirements:
${finalDesign.technicalRequirements.join("\n")}

Implementation Approach:
${finalDesign.implementationApproach}

Include:
1. Complete game initialization and setup
2. Game loop with proper timing
3. Player controls and movement
4. Game mechanics implementation
5. Score tracking and game state management
6. Clear comments explaining the code
7. Proper cleanup on game end`;

      setGenerationPrompt(defaultPrompt);
    }
  }, [finalDesign]);

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Game Design Assistant</h2>
            <Button
              variant="outline"
              onClick={fillDemoValues}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              Fill Demo Values
            </Button>
          </div>

          <div className="space-y-4">
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
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

              <ModelConfig onConfigChange={setModelConfig} />

              {finalDesign && (
                <>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Generation Prompt</h3>
                    <Textarea
                      value={generationPrompt}
                      onChange={(e) => setGenerationPrompt(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Customize how your game code should be generated..."
                    />
                  </div>

                  <div className="mt-4">
                    <GraphicsGenerator
                      gameDesign={finalDesign}
                      onGraphicsGenerated={onGraphicsGenerated}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-between mt-4 space-x-4">
                <Button variant="outline" onClick={handleBack}>
                  Edit Answers
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleThink}
                  disabled={analyzeModelMutation.isPending || finalizeMutation.isPending}
                >
                  {analyzeModelMutation.isPending || finalizeMutation.isPending ? (
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
                  onClick={() => generateFeaturesMutation.mutate()}
                  disabled={generateFeaturesMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  {generateFeaturesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Features...
                    </>
                  ) : (
                    <>
                      <ListPlus className="mr-2 h-4 w-4" />
                      Generate Features List
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleBuildGame}
                  disabled={generateMutation.isPending || Object.keys(analyses).length === 0}
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

interface AnalyzedAspect {
  analysis: string;
  implementation_details: string[];
  technical_considerations: string[];
}