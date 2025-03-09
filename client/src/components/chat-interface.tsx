import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Settings2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChatInterfaceProps {
  onCodeReceived: (code: string) => void;
}

export function ChatInterface({ onCodeReceived }: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (variables: { prompt: string; temperature: number; maxTokens: number }) =>
      sendChatMessage(variables.prompt, variables.temperature, variables.maxTokens),
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
    mutation.mutate({ prompt, temperature, maxTokens });
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Temperature: {temperature}
                  </label>
                  <Slider
                    value={[temperature]}
                    onValueChange={([value]) => setTemperature(value)}
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
                    Max Tokens: {maxTokens}
                  </label>
                  <Slider
                    value={[maxTokens]}
                    onValueChange={([value]) => setMaxTokens(value)}
                    min={500}
                    max={4000}
                    step={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum length of the generated response
                  </p>
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