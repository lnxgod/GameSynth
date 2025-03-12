import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ModelDebugInfoProps {
  modelConfig: {
    model: string;
    temperature?: number;
    reasoning_effort?: string;
  };
  operationType: string;
}

export function ModelDebugInfo({ modelConfig, operationType }: ModelDebugInfoProps) {
  return (
    <div className="p-2 border rounded mb-2 bg-muted/50">
      <div className="font-medium">{operationType}:</div>
      <div className="text-sm font-mono">
        <div>Model: {modelConfig.model}</div>
        {modelConfig.temperature !== undefined && (
          <div>Temperature: {modelConfig.temperature}</div>
        )}
        {modelConfig.reasoning_effort && (
          <div>Reasoning Effort: {modelConfig.reasoning_effort}</div>
        )}
      </div>
    </div>
  );
}

interface DebugMenuProps {
  codeGenModel: string;
  analysisModel: string;
  developmentPlanModel: string;
  graphicsModel: string;
  currentConfig: any;
}

export function DebugMenu({ 
  codeGenModel,
  analysisModel, 
  developmentPlanModel,
  graphicsModel,
  currentConfig
}: DebugMenuProps) {
  return (
    <Card className="w-full mt-4">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">Debug Information - Model Usage</h3>
        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
          <ModelDebugInfo 
            operationType="Code Generation"
            modelConfig={{
              model: codeGenModel,
              ...currentConfig
            }}
          />
          <ModelDebugInfo 
            operationType="Game Analysis"
            modelConfig={{
              model: analysisModel,
              reasoning_effort: "medium"
            }}
          />
          <ModelDebugInfo 
            operationType="Development Plan"
            modelConfig={{
              model: developmentPlanModel,
              reasoning_effort: "medium"
            }}
          />
          <ModelDebugInfo 
            operationType="Graphics Analysis"
            modelConfig={{
              model: graphicsModel,
              temperature: 0.7
            }}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
