import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface Feature {
  id: string;
  description: string;
  completed: boolean;
}

interface FeatureChecklistProps {
  gameDesign: any;
}

export function FeatureChecklist({ gameDesign }: FeatureChecklistProps) {
  const [features, setFeatures] = useState<Feature[]>([]);

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

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === id ? { ...feature, completed: !feature.completed } : feature
    ));
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
                      <label htmlFor={feature.id} className="text-sm">
                        {feature.description}
                      </label>
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
                      <label htmlFor={feature.id} className="text-sm">
                        {feature.description}
                      </label>
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
