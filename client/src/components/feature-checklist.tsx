import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Feature {
  id: string;
  description: string;
  completed: boolean;
}

interface FeatureChecklistProps {
  gameDesign: any;
  onCodeUpdate?: (code: string) => void;
}

export function FeatureChecklist({ gameDesign, onCodeUpdate }: FeatureChecklistProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const { toast } = useToast();

  // Initialize features from game design
  useEffect(() => {
    if (gameDesign) {
      const newFeatures: Feature[] = [
        ...gameDesign.coreMechanics.map((mechanic: string) => ({
          id: `mechanic-${mechanic}`,
          description: mechanic,
          completed: false
        })),
        ...gameDesign.technicalRequirements.map((req: string) => ({
          id: `tech-${req}`,
          description: req,
          completed: false
        }))
      ];
      setFeatures(newFeatures);
    }
  }, [gameDesign]);

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

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(feature =>
      feature.id === id ? { ...feature, completed: !feature.completed } : feature
    ));
  };

  const handleImplementFeature = (feature: Feature) => {
    implementFeatureMutation.mutate(feature.description);
  };

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
        <h3 className="text-lg font-semibold">Game Design Document</h3>
        <div className="space-y-4">
          <div>
            <div className="font-semibold">Game Description:</div>
            <p className="text-muted-foreground">{gameDesign.gameDescription}</p>
          </div>

          <div>
            <div className="font-semibold">Implementation Approach:</div>
            <p className="text-muted-foreground">{gameDesign.implementationApproach}</p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Features Checklist</h4>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium mb-2">Core Mechanics</h5>
                  {features.filter(f => f.id.startsWith('mechanic-')).map(feature => (
                    <div key={feature.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={feature.id}
                        checked={feature.completed}
                        onCheckedChange={() => toggleFeature(feature.id)}
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
                  {features.filter(f => f.id.startsWith('tech-')).map(feature => (
                    <div key={feature.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={feature.id}
                        checked={feature.completed}
                        onCheckedChange={() => toggleFeature(feature.id)}
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
      </div>
    </Card>
  );
}