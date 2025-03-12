import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Settings2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ModelConfig, type ModelConfig as ModelConfigType } from "./model-config";
import { DebugMenu } from "./model-debug-info";

interface ChatInterfaceProps {
  onCodeReceived: (code: string) => void;
}

const SYSTEM_PROMPT = `You are a game development assistant specialized in creating HTML5 Canvas games.
When providing code:
1. Always wrap the game code between +++CODESTART+++ and +++CODESTOP+++ markers
2. Focus on creating interactive, fun games using vanilla JavaScript and Canvas API
3. Include clear comments explaining the game mechanics
4. Return fully working, self-contained game code that handles its own game loop
5. Use requestAnimationFrame for animation
6. Handle cleanup properly when the game stops`;

export function ChatInterface({ onCodeReceived }: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    model: "o3-mini",
    temperature: 0.7,
    reasoning_effort: "medium"
  });
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (variables: { prompt: string; modelConfig: ModelConfigType }) =>
      apiRequest('POST', '/api/chat', {
        prompt: variables.prompt,
        modelConfig: variables.modelConfig
      }).then(res => res.json()),
    onSuccess: (data) => {
      if (data.code) {
        onCodeReceived(data.code);
      }
      toast({
        title: "Response received",
        description: "ChatGPT has generated your game code",
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
    mutation.mutate({ prompt, modelConfig });
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
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {SYSTEM_PROMPT}
                      </pre>
                    </ScrollArea>
                  </div>

                  <ModelConfig onConfigChange={setModelConfig} />
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

          <DebugMenu
            codeGenModel={modelConfig.model}
            analysisModel="o3-mini"
            developmentPlanModel="o1"
            graphicsModel="o3-mini"
            currentConfig={modelConfig}
          />
        </form>
      </CardContent>
    </Card>
  );
}