import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ListPlus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

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
}

export function FeatureChecklist({ gameDesign, onCodeUpdate, initialFeatures = [] }: FeatureChecklistProps) {
  const [newFeature, setNewFeature] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const generateFeaturesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/generate-features', {
        gameDesign,
        currentFeatures: features
      });
      return res.json();
    },
    onSuccess: (data) => {
      data.features.forEach((description: string) => {
        createFeatureMutation.mutate({
          description,
          type: 'generated',
          completed: false
        });
      });

      toast({
        title: "Features Generated",
        description: `Added ${data.features.length} new features to the checklist.`,
      });
    }
  });

  useEffect(() => {
    if (gameDesign && features.length === 0) {
      gameDesign.coreMechanics?.forEach((mechanic: string) => {
        createFeatureMutation.mutate({
          description: mechanic,
          type: 'core',
          completed: false
        });
      });

      gameDesign.technicalRequirements?.forEach((req: string) => {
        createFeatureMutation.mutate({
          description: req,
          type: 'tech',
          completed: false
        });
      });

      initialFeatures.forEach((feature: string) => {
        createFeatureMutation.mutate({
          description: feature,
          type: 'generated',
          completed: false
        });
      });
    }
  }, [gameDesign]);

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
    //  This part remains largely the same, except feature.description is used.  
    //  Consider refactoring to use a mutation for consistency.
    implementFeatureMutation.mutate(feature.description);
  };


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


  if (!gameDesign) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground italic">
          No game design available. Please use the Design Assistant first.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Game Features</h3>
          <Button
            onClick={() => generateFeaturesMutation.mutate()}
            disabled={generateFeaturesMutation.isPending}
            variant="secondary"
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
                <h5 className="font-medium mb-2">Core Mechanics</h5>
                {features.filter(f => f.type === 'core').map(feature => (
                  <div key={feature.id} className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={feature.id.toString()} // Ensure id is a string
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

              <div>
                <h5 className="font-medium mb-2">Technical Requirements</h5>
                {features.filter(f => f.type === 'tech').map(feature => (
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

              <div>
                <h5 className="font-medium mb-2">Additional Features</h5>
                {features.filter(f => f.type === 'generated' || f.type === 'manual').map(feature => (
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
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}