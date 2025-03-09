import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  onCodeReceived: (code: string) => void;
}

export function ChatInterface({ onCodeReceived }: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (data) => {
      if (data.code) {
        onCodeReceived(data.code);
      }
      toast({
        title: "Response received",
        description: "ChatGPT has responded to your prompt",
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
    mutation.mutate(prompt);
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
