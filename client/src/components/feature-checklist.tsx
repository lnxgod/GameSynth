import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
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
  onAiOperation: (op: { type: string; active: boolean }) => void;
  isNonTechnicalMode: boolean;
}

export function FeatureChecklist({ 
  gameDesign, 
  onCodeUpdate, 
  initialFeatures = [], 
  onAiOperation,
  isNonTechnicalMode 
}: FeatureChecklistProps) {
  const [newFeature, setNewFeature] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ['features'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/features');
      return res.json();
    }
  });

  useEffect(() => {
    if (initialFeatures.length > 0) {
      initialFeatures.forEach((feature: string) => {
        createFeatureMutation.mutate({
          description: feature,
          type: 'generated',
          completed: false
        });
      });
    }
  }, [initialFeatures]);

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
      const res = await apiRequest('POST', '/api/code/chat', {
        message: `Please implement this feature: ${feature}`,
        gameDesign
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.updatedCode) {
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

        <div className="flex gap-2 items-center">
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