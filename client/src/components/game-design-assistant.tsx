import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface GameDesignAssistantProps {
  onCodeGenerated: (code: string) => void;
}

export function GameDesignAssistant({ onCodeGenerated }: GameDesignAssistantProps) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest('POST', '/api/design/chat', {
        message,
        sessionId
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(data.history);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/generate', {
        sessionId
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.code) {
        onCodeGenerated(data.code);
        toast({
          title: "Success",
          description: "Game code has been generated based on your requirements!",
        });
      } else {
        toast({
          title: "Warning",
          description: "No code was generated. Try refining your game requirements.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Start the conversation when component mounts
  useEffect(() => {
    chatMutation.mutate("I want to create a game. Can you help me?");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    chatMutation.mutate(input);
    setInput("");
  };

  const handleGenerate = () => {
    if (messages.length < 4) {
      toast({
        title: "Warning",
        description: "Please discuss your game requirements more before generating code.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Game Design Assistant</h2>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || messages.length < 4}
              variant="outline"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Game
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'assistant'
                        ? 'bg-muted'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Type your response..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatMutation.isPending}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={chatMutation.isPending || !input.trim()}
            >
              {chatMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
