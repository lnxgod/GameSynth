import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ListPlus, Sparkles, Code } from "lucide-react";
import { AIHint } from "./ai-hint";

interface Feature {
  id: number;
  description: string;
  completed: boolean;
  type: 'core' | 'tech' | 'generated' | 'manual';
  gameId?: number;
}

interface FeatureChecklistProps {
  gameDesign: any;
  onCodeUpdate?: (code: string) => void;
  initialFeatures?: string[];
  onAiOperation?: (operation: { type: string; active: boolean }) => void;
  isNonTechnicalMode?: boolean;
}

export function FeatureChecklist({ gameDesign, onCodeUpdate, initialFeatures = [], onAiOperation, isNonTechnicalMode }: FeatureChecklistProps) {
  const [newFeature, setNewFeature] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGeneratingFromCode, setIsGeneratingFromCode] = useState(false);
  
  // We don't initialize features automatically anymore - user must click Generate button
  // This is intentional as per user request

  const { data: features = [] } = useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/features');
      return res.json();
    }
  });

  const createFeatureMutation = useMutation({
    mutationFn: async (feature: Omit<Feature, 'id'>) => {
      const res = await apiRequest('POST', '/api/features', feature);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({
        title: "Feature Added",
        description: "New feature has been added to the checklist.",
      });
    }
  });

  const updateFeatureStatusMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest('PATCH', `/api/features/${id}`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    }
  });

  const implementFeatureMutation = useMutation({
    mutationFn: async (feature: string) => {
      // Notify the UI that AI operation is in progress
      onAiOperation?.({ type: "Implementing Feature", active: true });
      
      // Get the current game code from localStorage
      const currentCode = localStorage.getItem('currentGameCode') || '';
      
      try {
        const res = await apiRequest('POST', '/api/code/chat', {
          code: currentCode,
          message: `Please implement this feature: ${feature}`,
          gameDesign
        });
        return res.json();
      } finally {
        // Notify the UI that AI operation is complete
        onAiOperation?.({ type: "", active: false });
      }
    },
    onSuccess: (data) => {
      if (data.updatedCode) {
        // Save the updated code to localStorage
        localStorage.setItem('currentGameCode', data.updatedCode);
        
        onCodeUpdate?.(data.updatedCode);
        toast({
          title: "Feature Implementation",
          description: "The selected feature has been implemented in the game code.",
        });
      }
    }
  });

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;

    createFeatureMutation.mutate({
      description: newFeature,
      type: 'manual',
      completed: false
    });

    setNewFeature("");
  };

  const toggleFeature = (id: number, completed: boolean) => {
    updateFeatureStatusMutation.mutate({ id, completed });
  };

  const handleImplementFeature = (feature: Feature) => {
    implementFeatureMutation.mutate(feature.description);
  };
  
  // New mutation for generating features from code
  const generateFeaturesFromCodeMutation = useMutation({
    mutationFn: async () => {
      // Notify the UI that AI operation is in progress
      onAiOperation?.({ type: "Analyzing Code for Features", active: true });
      setIsGeneratingFromCode(true);
      
      // Get the current game code from localStorage
      const currentCode = localStorage.getItem('currentGameCode') || '';
      
      try {
        const res = await apiRequest('POST', '/api/code/analyze-features', {
          code: currentCode,
          gameDesign: gameDesign
        });
        return res.json();
      } finally {
        // Notify the UI that AI operation is complete
        onAiOperation?.({ type: "", active: false });
        setIsGeneratingFromCode(false);
      }
    },
    onSuccess: (data) => {
      if (data.features && Array.isArray(data.features)) {
        // Add each suggested feature to the feature list
        data.features.forEach((feature: string) => {
          createFeatureMutation.mutate({
            description: feature,
            type: 'generated',
            completed: false
          });
        });
        
        toast({
          title: "Features Generated",
          description: `Generated ${data.features.length} features from code analysis.`,
        });
      } else {
        toast({
          title: "Feature Generation",
          description: "No new features were suggested. Try adding more code or details.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Feature Generation Failed",
        description: error.message || "An error occurred while generating features.",
        variant: "destructive"
      });
    }
  });

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Game Features</h3>
          <AIHint
            gameDesign={gameDesign}
            currentFeature={features.find((f: Feature) => !f.completed)?.description}
          />
        </div>

        <div className="flex gap-2 items-center mb-2">
          <Input
            placeholder="Add a new feature..."
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
          />
          <Button onClick={handleAddFeature} className="whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            Add Feature
          </Button>
        </div>
        
        <Button 
          onClick={() => generateFeaturesFromCodeMutation.mutate()}
          disabled={generateFeaturesFromCodeMutation.isPending || !localStorage.getItem('currentGameCode')}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
        >
          {generateFeaturesFromCodeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Code...
            </>
          ) : (
            <>
              <Code className="mr-2 h-4 w-4" />
              Generate Features from Code
            </>
          )}
        </Button>

        <div className="space-y-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">Generated Features</h5>
                {features.filter((f: Feature) => f.type === 'generated').map((feature: Feature) => (
                  <div key={feature.id} className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={feature.id.toString()}
                      checked={feature.completed}
                      onCheckedChange={() => toggleFeature(feature.id, !feature.completed)}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => handleImplementFeature(feature)}
                      disabled={implementFeatureMutation.isPending}
                      className="flex-grow text-left justify-start px-2 hover:bg-accent"
                    >
                      {feature.description}
                      {implementFeatureMutation.isPending && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {features.filter((f: Feature) => f.type === 'manual').length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Custom Features</h5>
                  {features.filter((f: Feature) => f.type === 'manual').map((feature: Feature) => (
                    <div key={feature.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={feature.id.toString()}
                        checked={feature.completed}
                        onCheckedChange={() => toggleFeature(feature.id, !feature.completed)}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => handleImplementFeature(feature)}
                        disabled={implementFeatureMutation.isPending}
                        className="flex-grow text-left justify-start px-2 hover:bg-accent"
                      >
                        {feature.description}
                        {implementFeatureMutation.isPending && (
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}