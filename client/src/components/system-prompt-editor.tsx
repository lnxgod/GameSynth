import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SYSTEM_PROMPT = `You are a game development assistant specialized in improving HTML5 Canvas games.
When providing suggestions:
1. Analyze the current game code and suggest specific improvements that could make the game more engaging
2. Focus on implementing remaining features
3. Consider performance optimizations and best practices
4. Provide clear, actionable feedback`;

export function SystemPromptEditor() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const { toast } = useToast();

  useEffect(() => {
    const savedPrompt = localStorage.getItem('systemPrompt');
    if (savedPrompt) {
      setSystemPrompt(savedPrompt);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('systemPrompt', systemPrompt);
    toast({
      title: "System Prompt Saved",
      description: "Your custom system prompt has been saved and will be used for future interactions.",
    });
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    localStorage.setItem('systemPrompt', DEFAULT_SYSTEM_PROMPT);
    toast({
      title: "System Prompt Reset",
      description: "The system prompt has been reset to its default value.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
          placeholder="Enter your custom system prompt..."
        />
        <div className="flex space-x-2">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Prompt
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
