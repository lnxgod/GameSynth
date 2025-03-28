import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ListPlus, Sparkles, Code, Trash2 } from "lucide-react";
import { AIHint } from "./ai-hint";

interface Feature {
  id: string; // Using client-side IDs now (string)
  description: string;
  completed: boolean;
  type: 'core' | 'tech' | 'generated' | 'manual';
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
  const [features, setFeatures] = useState<Feature[]>([]);
  const { toast } = useToast();
  const [isGeneratingFromCode, setIsGeneratingFromCode] = useState(false);
  
  // Clean up features on component mount
  useEffect(() => {
    // Clear any features that might be stored in the database as they should not persist
    const cleanupFeatures = async () => {
      try {
        await apiRequest('DELETE', '/api/features');
      } catch (error) {
        console.error("Failed to clear features:", error);
      }
    };
    
    cleanupFeatures();
    
    // Load initial features from localStorage if available
    const savedFeatures = localStorage.getItem('gameFeatures');
    if (savedFeatures) {
      try {
        setFeatures(JSON.parse(savedFeatures));
      } catch (error) {
        console.error("Failed to parse saved features:", error);
      }
    }
  }, []);
  
  // Save features to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gameFeatures', JSON.stringify(features));
  }, [features]);

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

    const newFeatureObj: Feature = {
      id: `manual_${Date.now()}`, // Generate client-side unique ID
      description: newFeature,
      type: 'manual',
      completed: false
    };
    
    setFeatures(prev => [...prev, newFeatureObj]);
    setNewFeature("");
    
    toast({
      title: "Feature Added",
      description: "New feature has been added to the checklist.",
    });
  };

  const toggleFeature = (id: string, completed: boolean) => {
    setFeatures(prev => 
      prev.map(feature => 
        feature.id === id ? { ...feature, completed } : feature
      )
    );
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
        // Add each suggested feature to the features state
        const newFeatures = data.features.map((featureDesc: string): Feature => ({
          id: `generated_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          description: featureDesc,
          type: 'generated',
          completed: false
        }));
        
        setFeatures(prev => [...prev, ...newFeatures]);
        
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
  
  const handleClearFeatures = () => {
    setFeatures([]);
    localStorage.removeItem('gameFeatures');
    toast({
      title: "Features Cleared",
      description: "All features have been removed from the checklist.",
    });
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Game Features</h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearFeatures}
              disabled={features.length === 0}
              className="flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            <AIHint
              gameDesign={gameDesign}
              currentFeature={features.find((f: Feature) => !f.completed)?.description}
            />
          </div>
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

        {features.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No features yet. Add a feature manually or generate from your game code.
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {features.filter((f: Feature) => f.type === 'generated').length > 0 && (
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
                )}

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
        )}
      </div>
    </Card>
  );
}