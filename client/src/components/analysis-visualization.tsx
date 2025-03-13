import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface AnalyzedAspect {
  analysis: string;
  implementation_details: string[];
  technical_considerations: string[];
}

interface AnalysisVisualizationProps {
  analyses: Record<string, AnalyzedAspect>;
}

export function AnalysisVisualization({ analyses }: AnalysisVisualizationProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const calculateProgress = (aspect: AnalyzedAspect): number => {
    const hasAnalysis = aspect.analysis.length > 0;
    const hasImplementationDetails = aspect.implementation_details.length > 0;
    const hasTechnicalConsiderations = aspect.technical_considerations.length > 0;
    
    return ((hasAnalysis ? 33.33 : 0) + 
            (hasImplementationDetails ? 33.33 : 0) + 
            (hasTechnicalConsiderations ? 33.33 : 0));
  };

  const getStatusIcon = (progress: number) => {
    if (progress >= 95) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (progress > 0) return <Circle className="h-5 w-5 text-yellow-500" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Detailed Analysis</h2>
          <ScrollArea className="h-[400px] w-full pr-4">
            {Object.entries(analyses).map(([aspect, analysis]) => {
              const progress = calculateProgress(analysis);
              return (
                <Collapsible
                  key={aspect}
                  open={openSections[aspect]}
                  onOpenChange={() => toggleSection(aspect)}
                  className="mb-4"
                >
                  <div className="flex items-center justify-between p-2 bg-muted rounded-t-lg">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(progress)}
                      <h3 className="text-sm font-medium capitalize">
                        {aspect.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={progress} className="w-24" />
                      <CollapsibleTrigger>
                        {openSections[aspect] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="p-4 border rounded-b-lg space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Analysis</h4>
                        <p className="text-sm text-muted-foreground">
                          {analysis.analysis}
                        </p>
                      </div>

                      {analysis.implementation_details.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Implementation Details
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {analysis.implementation_details.map((detail, index) => (
                              <li
                                key={index}
                                className="text-sm text-muted-foreground"
                              >
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.technical_considerations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Technical Considerations
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {analysis.technical_considerations.map(
                              (consideration, index) => (
                                <li
                                  key={index}
                                  className="text-sm text-muted-foreground"
                                >
                                  {consideration}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
