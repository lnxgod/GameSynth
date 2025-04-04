import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, ListPlus, Settings2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelParameterControls } from "@/components/model-parameter-controls";
import { AnalysisVisualization } from "@/components/analysis-visualization";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

type AnalysisResults = Record<keyof GameRequirements, AnalyzedAspect>;

interface AnalysisProgress {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  progress: number;
}

type AspectProgress = Record<keyof GameRequirements, AnalysisProgress>;

const gameTypes = [
  "Platformer",
  "Puzzle",
  "Arcade",
  "Space Shooter",
  "RPG",
  "Strategy",
  "Adventure",
  "Racing"
];

const visualStyles = [
  "Minimalist",
  "Retro",
  "Colorful",
  "Abstract",
  "Pixel Art",
  "Neon",
  "Hand-drawn",
  "Geometric"
];

const difficultyLevels = [
  "Easy",
  "Medium",
  "Hard",
  "Progressive",
  "Adaptive",
  "Tutorial-based",
  "Expert"
];

interface GameDesignAssistantProps {
  onCodeGenerated: (code: string) => void;
  onDesignGenerated: (design: any) => void;
  onFeaturesGenerated: (features: string[]) => void;
  debugContext?: string;
  initialSettings?: any;
  isNonTechnicalMode: boolean;
  onAiOperation: (operation: { type: string; active: boolean }) => void;
  selectedModel: string;
  onSelectedModelChange: (model: string) => void;
  modelParameters: any;
  onModelParametersChange: (params: any) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  analyses: any;
  onAnalysesChange: (analyses: any) => void;
  finalDesign: any;
  onFinalDesignChange: (design: any) => void;
  messages: Array<{ role: 'assistant' | 'user'; content: string }>;
  onMessagesChange: (messages: Array<{ role: 'assistant' | 'user'; content: string }>) => void;
}

export function GameDesignAssistant({
  onCodeGenerated,
  onDesignGenerated,
  onFeaturesGenerated,
  debugContext,
  initialSettings,
  isNonTechnicalMode,
  onAiOperation,
  selectedModel,
  onSelectedModelChange,
  modelParameters,
  onModelParametersChange,
  systemPrompt,
  onSystemPromptChange,
  analyses,
  onAnalysesChange,
  finalDesign,
  onFinalDesignChange,
  messages,
  onMessagesChange
}: GameDesignAssistantProps) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [requirements, setRequirements] = useState<GameRequirements>(() => {
    const savedRequirements = localStorage.getItem('gameRequirements');
    if (savedRequirements) {
      return JSON.parse(savedRequirements);
    }
    if (initialSettings) {
      return {
        gameType: initialSettings.gameType || "",
        mechanics: initialSettings.mechanics || "",
        visualStyle: initialSettings.visualStyle || "",
        difficulty: initialSettings.difficulty || "",
        specialFeatures: initialSettings.specialFeatures || ""
      };
    }
    return {
      gameType: "",
      mechanics: "",
      visualStyle: "",
      difficulty: "",
      specialFeatures: ""
    };
  });
  const [editableDesign, setEditableDesign] = useState<string>("");
  const [generatedFeatures, setGeneratedFeatures] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState<AspectProgress>({
    gameType: { status: 'idle', progress: 0 },
    mechanics: { status: 'idle', progress: 0 },
    visualStyle: { status: 'idle', progress: 0 },
    difficulty: { status: 'idle', progress: 0 },
    specialFeatures: { status: 'idle', progress: 0 }
  });
  const [isTemplateSaveOpen, setIsTemplateSaveOpen] = useState(false);
  const [templateDetails, setTemplateDetails] = useState({
    name: "",
    description: "",
    category: "Other",
    tags: [] as string[],
  });
  const { toast } = useToast();

  const { data: availableModels, isLoading: isLoadingModels, error: modelsError } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/models');
      return res.json();
    },
    retry: 2,
    staleTime: 3600000 // Cache for 1 hour
  });

  const analyzeMutation = useMutation({
    mutationFn: async (aspect: keyof GameRequirements) => {
      setAnalysisProgress(prev => ({
        ...prev,
        [aspect]: { status: 'analyzing', progress: 0 }
      }));

      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => ({
          ...prev,
          [aspect]: {
            ...prev[aspect],
            progress: Math.min(95, (prev[aspect].progress || 0) + 10)
          }
        }));
      }, 500);

      try {
        const res = await apiRequest('POST', '/api/design/analyze', {
          aspect,
          content: requirements[aspect],
          sessionId,
          model: selectedModel,
          parameters: modelParameters
        });
        clearInterval(progressInterval);
        return res.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data, aspect) => {
      onAnalysesChange({
        ...analyses,
        [aspect]: data
      });
      setAnalysisProgress(prev => ({
        ...prev,
        [aspect]: { status: 'complete', progress: 100 }
      }));
    },
    onError: (error, aspect) => {
      setAnalysisProgress(prev => ({
        ...prev,
        [aspect]: { status: 'error', progress: 0 }
      }));
      toast({
        title: `Error Analyzing ${aspect}`,
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/finalize', {
        sessionId,
        model: selectedModel,
        parameters: modelParameters,
        systemPrompt
      });
      return res.json();
    },
    onSuccess: (data) => {
      onMessagesChange(data.history);
      onFinalDesignChange(data);
      setEditableDesign(data.description || "");
      onDesignGenerated(data);
      toast({
        title: "Design Ready",
        description: "Game design is complete and ready for implementation!",
      });
    }
  });

  const generateFeaturesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/generate-features', {
        gameDesign: finalDesign,
        currentFeatures: generatedFeatures,
        model: selectedModel,
        parameters: modelParameters
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.features || !Array.isArray(data.features)) {
        throw new Error("Invalid response format from server");
      }
      setGeneratedFeatures(prev => [...prev, ...data.features]);
      onFeaturesGenerated([...generatedFeatures, ...data.features]);
      toast({
        title: "Features Generated",
        description: `Added ${data.features.length} new features to the game design.`,
      });
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/generate', {
        sessionId,
        analyses: Object.fromEntries(
          Object.entries(analyses as AnalysisResults).map(([key, value]) => [
            key,
            {
              analysis: value.analysis,
              implementation_details: value.implementation_details,
              technical_considerations: value.technical_considerations
            }
          ])
        ),
        model: selectedModel,
        parameters: modelParameters,
        design: editableDesign,
        systemPrompt
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.code) {
        // Update localStorage with the new game code
        localStorage.setItem('currentGameCode', data.code);
        
        onCodeGenerated(data.code);
        toast({
          title: "Success",
          description: "Game code has been generated!",
        });
      }
      onDesignGenerated(data);
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/templates", {
        name: templateDetails.name,
        description: templateDetails.description,
        category: templateDetails.category,
        tags: templateDetails.tags,
        code: editableDesign,
        defaultSettings: {
          gameType: requirements.gameType,
          mechanics: requirements.mechanics,
          visualStyle: requirements.visualStyle,
          difficulty: requirements.difficulty,
          specialFeatures: requirements.specialFeatures,
          modelParameters: {
            model: selectedModel,
            ...modelParameters
          },
          systemPrompt
        },
        isPublic: true
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Saved",
        description: "Your game has been saved as a template!",
      });
      setIsTemplateSaveOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleThink = async () => {
    if (!requirements.gameType || !requirements.mechanics || !requirements.visualStyle || !requirements.difficulty || !requirements.specialFeatures) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      });
      return;
    }

    try {
      const aspects = Object.keys(requirements) as (keyof GameRequirements)[];
      const analysisPromises = aspects.map(aspect => analyzeMutation.mutateAsync(aspect));
      await Promise.all(analysisPromises);
      await finalizeMutation.mutateAsync();

      // After successful analysis, save the current state
      localStorage.setItem('gameRequirements', JSON.stringify(requirements));
      localStorage.setItem('analyses', JSON.stringify(analyses));
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: "Failed to complete analysis",
        variant: "destructive"
      });
    }
  };

  const renderCurrentPrompt = () => {
    if (finalDesign) {
      return (
        <div className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Game Design Document</h3>
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
          </div>
          <AnalysisVisualization analyses={analyses} />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <AnalysisVisualization analyses={analyses} />
      </div>
    );
  };

  const AspectProgressIndicator = ({ aspect }: { aspect: keyof GameRequirements }) => {
    const progress = analysisProgress[aspect];
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="capitalize">{aspect}</span>
          <span>{progress.status === 'complete' ? '100%' : `${progress.progress}%`}</span>
        </div>
        <Progress
          value={progress.progress}
          className={`h-2 ${
            progress.status === 'error'
              ? 'bg-red-200 [&>div]:bg-red-500'
              : progress.status === 'complete'
                ? 'bg-green-200 [&>div]:bg-green-500'
                : ''
          }`}
        />
      </div>
    );
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateDetails.name || !templateDetails.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    saveTemplateMutation.mutate();
  };

  useEffect(() => {
    if (initialSettings) {
      setRequirements({
        gameType: initialSettings.gameType || requirements.gameType,
        mechanics: initialSettings.mechanics || requirements.mechanics,
        visualStyle: initialSettings.visualStyle || requirements.visualStyle,
        difficulty: initialSettings.difficulty || requirements.difficulty,
        specialFeatures: initialSettings.specialFeatures || requirements.specialFeatures
      });
    }
  }, [initialSettings, requirements]);

  useEffect(() => {
    localStorage.setItem('gameRequirements', JSON.stringify(requirements));
  }, [requirements]);


  const handleModelChange = (model: string) => {
    onSelectedModelChange(model);
  };

  const handleParametersChange = (params: any) => {
    onModelParametersChange(params);
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Game Design Assistant</h2>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Settings2 className="mr-2 h-4 w-4" />
                Advanced Settings
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-md">
              <div className="space-y-2">
                <label className="text-sm font-medium">System Prompt</label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => onSystemPromptChange(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Customize the AI's behavior and focus..."
                />
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">AI Model</label>
                <Select
                  value={selectedModel}
                  onValueChange={handleModelChange}
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
                          {String(name)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <ModelParameterControls
                model={selectedModel}
                onParametersChange={handleParametersChange}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Type</label>
                <Select
                  value={requirements.gameType}
                  onValueChange={(value) => setRequirements(prev => ({ ...prev, gameType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select game type" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Visual Style</label>
                <Select
                  value={requirements.visualStyle}
                  onValueChange={(value) => setRequirements(prev => ({ ...prev, visualStyle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visual style" />
                  </SelectTrigger>
                  <SelectContent>
                    {visualStyles.map(style => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty Level</label>
                <Select
                  value={requirements.difficulty}
                  onValueChange={(value) => setRequirements(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Mechanics</label>
                <Textarea
                  placeholder="Describe how the game will be played..."
                  value={requirements.mechanics}
                  onChange={(e) => setRequirements(prev => ({ ...prev, mechanics: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Special Features</label>
                <Textarea
                  placeholder="Any unique mechanics or elements that make your game special..."
                  value={requirements.specialFeatures}
                  onChange={(e) => setRequirements(prev => ({ ...prev, specialFeatures: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Analysis Progress</h3>
                {Object.keys(requirements).map((aspect) => (
                  <AspectProgressIndicator
                    key={aspect}
                    aspect={aspect as keyof GameRequirements}
                  />
                ))}
              </Card>
              <Card className="p-4">
                <ScrollArea className="h-[300px]">
                  {renderCurrentPrompt()}
                </ScrollArea>
              </Card>
            </div>

            {finalDesign && (
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Final Design (Editable)</h3>
                <Textarea
                  value={editableDesign}
                  onChange={(e) => setEditableDesign(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Edit the game design description..."
                />
              </Card>
            )}

            <div className="flex justify-end space-x-4">
              <Button
                variant="secondary"
                onClick={handleThink}
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Analyze Design
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                onClick={() => generateFeaturesMutation.mutate()}
                disabled={generateFeaturesMutation.isPending || !finalDesign}
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
                    Generate Features
                  </>
                )}
              </Button>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || !finalDesign}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Code
                  </>
                )}
              </Button>
              {finalDesign && (
                <Dialog open={isTemplateSaveOpen} onOpenChange={setIsTemplateSaveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600">
                      <Save className="mr-2 h-4 w-4" />
                      Save as Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Game as Template</DialogTitle>
                      <DialogDescription>
                        Fill in the details to save this game as a reusable template.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveTemplate} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Template Name</label>
                        <Input
                          required
                          value={templateDetails.name}
                          onChange={(e) => setTemplateDetails(prev => ({
                            ...prev,
                            name: e.target.value
                          }))}
                          placeholder="Enter a name for your template"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          required
                          value={templateDetails.description}
                          onChange={(e) => setTemplateDetails(prev => ({
                            ...prev,
                            description: e.target.value
                          }))}
                          placeholder="Describe your game template"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={templateDetails.category}
                          onValueChange={(value) => setTemplateDetails(prev => ({
                            ...prev,
                            category: value
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Platformer">Platformer</SelectItem>
                            <SelectItem value="Shooter">Shooter</SelectItem>
                            <SelectItem value="Puzzle">Puzzle</SelectItem>
                            <SelectItem value="RPG">RPG</SelectItem>
                            <SelectItem value="Strategy">Strategy</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tags (comma-separated)</label>
                        <Input
                          value={templateDetails.tags.join(", ")}
                          onChange={(e) => setTemplateDetails(prev => ({
                            ...prev,
                            tags: e.target.value.split(",").map(tag => tag.trim())
                          }))}
                          placeholder="2D, Arcade, etc."
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={saveTemplateMutation.isPending}
                        >
                          {saveTemplateMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Template"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="space-y-4">

            </div>
          </div>

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
                        {typeof message.content === 'string' ? message.content : String(message.content)}
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