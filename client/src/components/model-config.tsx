import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelConfigProps {
  onConfigChange: (config: ModelConfig) => void;
}

export interface ModelConfig {
  model: string;
  temperature: number;
  reasoning_effort: "low" | "medium" | "high";
  max_completion_tokens?: number;
}

export function ModelConfig({ onConfigChange }: ModelConfigProps) {
  const [config, setConfig] = useState<ModelConfig>({
    model: "o3-mini",
    temperature: 0.7,
    reasoning_effort: "medium"
  });

  const handleChange = (key: keyof ModelConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <Card className="w-full mb-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Model Configuration</h3>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Select
                value={config.model}
                onValueChange={(value) => handleChange("model", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="o3-mini">O3 Mini</SelectItem>
                  <SelectItem value="o1">O1</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4 Optimized</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={config.temperature}
                onChange={(e) => handleChange("temperature", parseFloat(e.target.value))}
              />
            </div>

            {config.model.startsWith('o3') && (
              <>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="reasoning_effort">Reasoning Effort</Label>
                  <Select
                    value={config.reasoning_effort}
                    onValueChange={(value) => handleChange("reasoning_effort", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reasoning effort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="max_completion_tokens">Max Completion Tokens</Label>
                  <Input
                    id="max_completion_tokens"
                    type="number"
                    min={1}
                    max={32000}
                    value={config.max_completion_tokens}
                    onChange={(e) => handleChange("max_completion_tokens", parseInt(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}