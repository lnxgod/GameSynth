import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, ListPlus, Settings2, Bug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

// Update the ModelType definition to be more flexible
type ModelType = string;
type ModelInfo = Record<ModelType, string>;

interface GameDesignAssistantProps {
  onCodeGenerated: (code: string) => void;
  onDesignGenerated: (design: any) => void;
  onFeaturesGenerated: (features: string[]) => void;
  debugContext?: string;
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

export function GameDesignAssistant({
  onCodeGenerated,
  onDesignGenerated,
  onFeaturesGenerated,
  debugContext
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

  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(8000);
  const [useMaxCompleteTokens, setUseMaxCompleteTokens] = useState(false);

  const [showDebugContext, setShowDebugContext] = useState(false);

  const [selectedModel, setSelectedModel] = useState<ModelType>('gpt-4o');
  const [modelParameters, setModelParameters] = useState<Record<string, any>>({});
  const [isLoadingParameters, setIsLoadingParameters] = useState(false);

  const { data: availableModels, isLoading: isLoadingModels, error: modelsError } = useQuery<ModelInfo>({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/models');
      const models = await res.json();
      return models;
    },
    retry: 2,
    staleTime: 3600000 // Cache for 1 hour
  });

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

  const generateFeaturesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/generate-features', {
        gameDesign: finalDesign,
        currentFeatures: generatedFeatures
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.features || !Array.isArray(data.features)) {
        throw new Error("Invalid response format");
      }

      setGeneratedFeatures([...generatedFeatures, ...data.features]);
      onFeaturesGenerated([...generatedFeatures, ...data.features]);

      toast({
        title: "Features Generated",
        description: `Added ${data.features.length} new features to the game design.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Generating Features",
        description: error.message,
        variant: "destructive",
      });
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
        ),
        settings: {
          temperature,
          ...(useMaxCompleteTokens && selectedModel.startsWith('o1')
            ? { max_completion_tokens: maxTokens }
            : { max_tokens: maxTokens }
          ),
          model: selectedModel
        }
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

  const handleThink = async () => {
    for (const question of questions) {
      const aspect = question.id as keyof GameRequirements;
      await analyzeMutation.mutateAsync(aspect);
    }
    await finalizeMutation.mutateAsync();
  };

  const currentQuestion = questions[currentQuestionIndex];

  const renderDesignDoc = () => {
    if (!finalDesign) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Game Design Document</h3>
        <div className="space-y-4">
          <div>
            <div className="font-semibold">Initial Requirements:</div>
            <ul className="list-disc pl-4">
              <li>Game Type: {requirements.gameType}</li>
              <li>Mechanics: {requirements.mechanics}</li>
              <li>Visual Style: {requirements.visualStyle}</li>
              <li>Difficulty: {requirements.difficulty}</li>
              <li>Special Features: {requirements.specialFeatures}</li>
            </ul>
          </div>

          <div>
            <div className="font-semibold">Technical Analysis:</div>
            {Object.entries(analyses).map(([aspect, analysis]) => (
              <div key={aspect} className="mt-2">
                <div className="font-medium capitalize">{aspect}:</div>
                <div className="text-sm text-muted-foreground">{analysis?.analysis}</div>
                <ul className="list-disc pl-4 text-sm mt-1">
                  {analysis?.implementation_details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {Object.keys(followUpAnswers).length > 0 && (
            <div>
              <div className="font-semibold">Follow-up Details:</div>
              <ul className="list-disc pl-4">
                {Object.entries(followUpAnswers).map(([question, answer], index) => (
                  <li key={index}>
                    <span className="font-medium">{question}</span>: {answer}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAIPrompt = () => {
    if (!finalDesign) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">AI Generation Prompt</h3>
        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {`Creating HTML5 Canvas game with the following specifications:
Game Description:
${finalDesign.gameDescription}

Core Mechanics:
${finalDesign.coreMechanics.join("\n")}

Technical Requirements:
${finalDesign.technicalRequirements.join("\n")}

Implementation Approach:
${finalDesign.implementationApproach}

Additional Specifications:
${Object.entries(analyses).map(([aspect, analysis]) =>
  `${aspect.toUpperCase()}:
  - Analysis: ${analysis?.analysis}
  - Implementation: ${analysis?.implementation_details.join(", ")}
  - Technical: ${analysis?.technical_considerations.join(", ")}`
).join("\n\n")}

Follow-up Details:
${Object.entries(followUpAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n")}`}
          </pre>
        </ScrollArea>
      </div>
    );
  };

  const renderCurrentPrompt = () => {
    if (finalDesign) {
      return (
        <>
          {renderDesignDoc()}
          {renderAIPrompt()}
        </>
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

  const renderDebugContext = () => {
    if (!debugContext) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Debug Context</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugContext(!showDebugContext)}
          >
            {showDebugContext ? "Hide Context" : "Show Context"}
          </Button>
        </div>

        {showDebugContext && (
          <Card className="p-4">
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Bug className="h-5 w-5 mt-1 text-yellow-500" />
                  <div>
                    <div className="font-medium">Current Debug Information:</div>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {debugContext}
                    </pre>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
    );
  };

  // Fetch model parameters when model changes
  useEffect(() => {
    const fetchModelParameters = async () => {
      if (!selectedModel) return;

      setIsLoadingParameters(true);
      try {
        const res = await apiRequest('GET', `/api/model-parameters/${selectedModel}`);
        const params = await res.json();
        setModelParameters(params);
      } catch (error) {
        console.error('Failed to fetch model parameters:', error);
        toast({
          title: "Error",
          description: "Failed to load model parameters",
          variant: "destructive",
        });
      } finally {
        setIsLoadingParameters(false);
      }
    };

    fetchModelParameters();
  }, [selectedModel, toast]);


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

          {renderDebugContext()}

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

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Generation Settings
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-md">
                  {/* Model Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model Selection</label>
                    <Select
                      value={selectedModel}
                      onValueChange={(value) => setSelectedModel(value as ModelType)}
                      disabled={isLoadingModels}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingModels ? (
                          <SelectItem value="loading">Loading available models...</SelectItem>
                        ) : modelsError ? (
                          <SelectItem value="error">Error loading models</SelectItem>
                        ) : (
                          availableModels && Object.entries(availableModels).map(([id, name]) => (
                            <SelectItem key={id} value={id}>
                              {name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingModels ? "Loading available models..." :
                        modelsError ? "Error loading models, using defaults" :
                          "Select the AI model to use for code generation"}
                    </p>
                  </div>

                  {isLoadingParameters ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : (
                    <>
                      {Object.entries(modelParameters).map(([param, config]) => (
                        <div key={param} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">
                              {param.split('_').map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </label>
                            {config.type === "float" || config.type === "integer" ? (
                              <div className="w-64">
                                <Slider
                                  value={[
                                    param === "temperature" ? temperature :
                                      param === "max_tokens" ? maxTokens :
                                        param === "max_completion_tokens" ? maxTokens :
                                          0
                                  ]}
                                  onValueChange={([value]) => {
                                    if (param === "temperature") setTemperature(value);
                                    else if (param === "max_tokens" || param === "max_completion_tokens") setMaxTokens(value);
                                  }}
                                  min={config.min}
                                  max={config.max}
                                  step={config.type === "float" ? 0.1 : 1}
                                  className="w-full"
                                />
                              </div>
                            ) : config.type === "enum" ? (
                              <Select
                                value={param === "response_format" ? "json_object" : undefined}
                                onValueChange={(value) => {
                                  // Handle enum parameter changes
                                }}
                              >
                                <SelectTrigger className="w-64">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {config.values.map((value: string) => (
                                    <SelectItem key={value} value={value}>
                                      {value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {config.description}
                          </div>
                        </div>
                      ))}

                      {selectedModel.startsWith('o1') && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="use-max-complete-tokens"
                            checked={useMaxCompleteTokens}
                            onCheckedChange={(checked) => setUseMaxCompleteTokens(checked as boolean)}
                          />
                          <label
                            htmlFor="use-max-complete-tokens"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Use max_completion_tokens for O1 models
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>

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