import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Download, Trash2, RotateCcw, MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  addDebugLog?: (message: string) => void;
}

export function CodeEditor({ code, onCodeChange, addDebugLog }: CodeEditorProps) {
  const [localCode, setLocalCode] = useState(code);
  const [savedGames, setSavedGames] = useState<{ name: string; code: string }[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'assistant' | 'user', content: string }>>([]);
  const { toast } = useToast();

  // Load saved games from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("savedGames");
    if (saved) {
      setSavedGames(JSON.parse(saved));
    }
  }, []);

  // Update local code when prop changes
  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalCode(e.target.value);
    onCodeChange(e.target.value);
  };

  const handleSave = () => {
    if (!saveName) {
      toast({
        title: "Error",
        description: "Please enter a name for your game",
        variant: "destructive",
      });
      return;
    }

    const newSavedGames = [...savedGames, { name: saveName, code: localCode }];
    setSavedGames(newSavedGames);
    localStorage.setItem("savedGames", JSON.stringify(newSavedGames));

    toast({
      title: "Success",
      description: `Game "${saveName}" saved successfully`,
    });
    setSaveName("");
  };

  const handleLoad = (savedCode: string) => {
    setLocalCode(savedCode);
    onCodeChange(savedCode);
    toast({
      title: "Success",
      description: "Game code loaded successfully",
    });
  };

  const handleReset = () => {
    setLocalCode("");
    onCodeChange("");
    toast({
      title: "Reset",
      description: "Code editor has been reset",
    });
  };

  const handleClearSaved = () => {
    localStorage.removeItem("savedGames");
    setSavedGames([]);
    toast({
      title: "Cleared",
      description: "All saved games have been removed",
    });
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/code/chat", {
        code: localCode,
        message
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Add AI's response to chat history
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message }]);

      // If we got updated code, apply it
      if (data.updatedCode) {
        setLocalCode(data.updatedCode);
        onCodeChange(data.updatedCode);
        addDebugLog?.("Code updated via chat");
        toast({
          title: "Code Updated",
          description: "The game code has been updated based on your request",
        });
      } else {
        toast({
          title: "Info",
          description: "Got response but no code changes were needed",
        });
      }
    },
    onError: (error) => {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "Error: Failed to process your request" 
      }]);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Add user message to chat history
    setChatHistory(prev => [...prev, { role: 'user', content: chatMessage }]);

    // Save the current code state before making changes
    const previousCode = localCode;

    chatMutation.mutate(chatMessage);
    setChatMessage("");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Enter game name to save"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSave} className="whitespace-nowrap">
              <Save className="mr-2 h-4 w-4" />
              Save Game
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleClearSaved} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Saved
            </Button>
            <Button onClick={() => setShowChat(!showChat)} variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              {showChat ? "Hide Chat" : "Show Chat"}
            </Button>
          </div>

          {savedGames.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {savedGames.map((game, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleLoad(game.code)}
                  className="whitespace-nowrap"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Load "{game.name}"
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            <textarea
              value={localCode}
              onChange={handleCodeChange}
              className="w-full h-[600px] font-mono text-sm p-4 bg-background border rounded-md"
              spellCheck="false"
            />

            {showChat && (
              <Card className="w-96 p-4">
                <div className="space-y-4">
                  <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                    <div className="space-y-4">
                      {chatHistory.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${
                            msg.role === 'assistant' ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'assistant'
                                ? 'bg-muted'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            <pre className="whitespace-pre-wrap text-sm">
                              {msg.content}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <form onSubmit={handleChatSubmit} className="space-y-2">
                    <Textarea
                      placeholder="Ask about modifying or debugging your code..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={chatMutation.isPending}
                    >
                      {chatMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </form>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
