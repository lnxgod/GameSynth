import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Settings2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInterfaceProps {
  onCodeReceived: (code: string) => void;
  selectedModel: string;
  onSelectedModelChange: (model: string) => void;
  modelParameters: any;
  onModelParametersChange: (params: any) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  onAiOperation: (operation: { type: string; active: boolean }) => void;
  isNonTechnicalMode: boolean;
}

export function ChatInterface({
  onCodeReceived,
  selectedModel,
  onSelectedModelChange,
  modelParameters,
  onModelParametersChange,
  systemPrompt,
  onSystemPromptChange,
  onAiOperation,
  isNonTechnicalMode
}: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (variables: { prompt: string }) => {
      onAiOperation({ type: "Generating Game Code", active: true });
      try {
        const response = await apiRequest("POST", "/api/chat", {
          prompt: variables.prompt,
          modelConfig: {
            model: selectedModel,
            temperature: modelParameters.temperature || 0.7,
            max_tokens: modelParameters.maxTokens || 16000,
          }
        });
        return await response.json();
      } finally {
        onAiOperation({ type: "", active: false });
      }
    },
    onSuccess: (data) => {
      if (data.code) {
        onCodeReceived(data.code);
      }
      toast({
        title: "Response received",
        description: "AI has generated your game code",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    mutation.mutate({ prompt });
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Game Description</h2>
            <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model Selection</label>
                    <Select
                      value={selectedModel}
                      onValueChange={onSelectedModelChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4 Optimized (Latest)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Prompt</label>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {systemPrompt}
                      </pre>
                    </ScrollArea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Temperature: {modelParameters.temperature || 0.7}
                    </label>
                    <Slider
                      value={[modelParameters.temperature || 0.7]}
                      onValueChange={([value]) => onModelParametersChange({
                        ...modelParameters,
                        temperature: value
                      })}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values make the output more creative but less predictable
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Max Tokens: {modelParameters.maxTokens || 16000}
                    </label>
                    <Slider 
                      value={[modelParameters.maxTokens || 16000]}
                      onValueChange={([value]) => onModelParametersChange({
                        ...modelParameters,
                        maxTokens: value
                      })}
                      min={1000}
                      max={16000} 
                      step={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum length of the generated response
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <Textarea
            placeholder="Describe the game you want to create..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Game"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}