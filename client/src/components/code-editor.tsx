import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Download, Trash2, RotateCcw, MessageSquare, Loader2, Wand2, Bug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

interface ProjectState {
  name: string;
  code: string;
  gameDesign: any;
  features: Feature[];
  timestamp: string;
}

interface Feature {
  id: string;
  description: string;
  completed: boolean;
}

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  addDebugLog?: (message: string) => void;
  gameDesign?: any;
}

export function CodeEditor({ code, onCodeChange, addDebugLog, gameDesign }: CodeEditorProps) {
  const [localCode, setLocalCode] = useState(code);
  const [savedProjects, setSavedProjects] = useState<ProjectState[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'assistant' | 'user', content: string }>>([]);
  const [remixSuggestions, setRemixSuggestions] = useState<string[]>([]);
  const [showRemixSuggestions, setShowRemixSuggestions] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (gameDesign && gameDesign.coreMechanics && gameDesign.technicalRequirements) {
      const newFeatures: Feature[] = [
        ...(gameDesign.coreMechanics || []).map((mechanic: string) => ({
          id: `mechanic-${mechanic}`,
          description: mechanic,
          completed: false
        })),
        ...(gameDesign.technicalRequirements || []).map((req: string) => ({
          id: `tech-${req}`,
          description: req,
          completed: false
        }))
      ];
      setFeatures(newFeatures);
    }
  }, [gameDesign]);

  useEffect(() => {
    const saved = localStorage.getItem("savedProjects");
    if (saved) {
      setSavedProjects(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalCode(e.target.value);
    onCodeChange(e.target.value);
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/code/chat", {
        code: localCode,
        message,
        gameDesign
      });
      return res.json();
    },
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (data.updatedCode) {
        setLocalCode(data.updatedCode);
        onCodeChange(data.updatedCode);
        addDebugLog?.("Code updated via chat");
        toast({
          title: "Code Updated",
          description: "The game code has been updated based on your request",
        });
      }
    }
  });

  const remixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/code/remix", {
        code: localCode,
        features: features.map(f => f.description)
      });
      return res.json();
    },
    onSuccess: (data) => {
      setRemixSuggestions(data.questions || []);
      setShowRemixSuggestions(true);
      toast({
        title: "Ready to Remix",
        description: "Choose an improvement to implement!",
      });
    }
  });

  const extractGameErrors = () => {
    // Query both error logs and debug logs to ensure we catch all errors
    const consoleLog = document.querySelector('.webview_console_logs')?.textContent || '';

    // Look for errors in the format we receive from the game execution
    const errorPattern = /"message":"([^"]+)"/;
    const match = consoleLog.match(errorPattern);

    if (match && match[1]) {
      return match[1];
    }

    // Fallback to looking for general error messages
    if (consoleLog.includes('Error executing game code:')) {
      const errorMatch = consoleLog.match(/Error executing game code:(.*?)(?=\n|$)/);
      return errorMatch ? errorMatch[1].trim() : null;
    }

    return null;
  };

  const debugMutation = useMutation({
    mutationFn: async () => {
      const errorMessage = extractGameErrors();
      if (!errorMessage) {
        throw new Error("No error found in game execution");
      }

      const res = await apiRequest("POST", "/api/code/debug", {
        code: localCode,
        error: errorMessage
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.updatedCode) {
        setLocalCode(data.updatedCode);
        onCodeChange(data.updatedCode);
        addDebugLog?.("🔧 AI Debug: Applied suggested fixes");

        toast({
          title: "Debug Fixes Applied",
          description: data.message || "Your code has been updated to fix the detected issues",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Debug Assistant",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setChatHistory(prev => [...prev, { role: 'user', content: chatMessage }]);
    chatMutation.mutate(chatMessage);
    setChatMessage("");
  };

  const handleRemixSelection = (suggestion: string) => {
    chatMutation.mutate(`Please implement this improvement: ${suggestion}`);
    setShowRemixSuggestions(false);
    toast({
      title: "Implementing Improvement",
      description: "Updating game code with selected enhancement...",
    });
  };

  const handleSave = () => {
    if (!saveName) {
      toast({
        title: "Error",
        description: "Please enter a name for your project",
        variant: "destructive",
      });
      return;
    }

    const projectState: ProjectState = {
      name: saveName,
      code: localCode,
      gameDesign: gameDesign || {},
      features: features,
      timestamp: new Date().toISOString(),
    };

    const newSavedProjects = [...savedProjects, projectState];
    setSavedProjects(newSavedProjects);
    localStorage.setItem("savedProjects", JSON.stringify(newSavedProjects));

    toast({
      title: "Success",
      description: `Project "${saveName}" saved successfully`,
    });
    setSaveName("");
  };

  const handleLoad = (project: ProjectState) => {
    setLocalCode(project.code);
    onCodeChange(project.code);
    if (project.features) {
      setFeatures(project.features);
    }

    toast({
      title: "Success",
      description: "Project loaded successfully",
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset? This will clear the current code.")) {
      setLocalCode("");
      onCodeChange("");
      toast({
        title: "Reset",
        description: "Code editor has been reset",
      });
    }
  };

  const handleClearSaved = () => {
    if (confirm("Are you sure you want to clear all saved projects? This cannot be undone.")) {
      localStorage.removeItem("savedProjects");
      setSavedProjects([]);
      toast({
        title: "Cleared",
        description: "All saved projects have been removed",
      });
    }
  };

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(feature =>
      feature.id === id ? { ...feature, completed: !feature.completed } : feature
    ));
  };

  const handleDebug = () => {
    addDebugLog?.("🔍 AI Debug: Analyzing game code...");
    debugMutation.mutate();
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Enter project name to save"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSave} className="whitespace-nowrap">
            <Save className="mr-2 h-4 w-4" />
            Save Project
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
          <Button
            onClick={() => remixMutation.mutate()}
            variant="secondary"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            disabled={remixMutation.isPending}
          >
            {remixMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                REMIX
              </>
            )}
          </Button>
          <Button
            onClick={handleDebug}
            variant="outline"
            className="bg-gradient-to-r from-yellow-100 to-orange-100 hover:from-yellow-200 hover:to-orange-200 border-yellow-500"
            disabled={debugMutation.isPending}
          >
            {debugMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI Fixing...
              </>
            ) : (
              <>
                <Bug className="mr-2 h-4 w-4" />
                AI Debug
              </>
            )}
          </Button>
        </div>

        {savedProjects.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Saved Projects</h3>
            <ScrollArea className="h-32 w-full rounded-md border">
              <div className="p-4 space-y-2">
                {savedProjects.map((project, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Saved on: {new Date(project.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLoad(project)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <textarea
              value={localCode}
              onChange={handleCodeChange}
              className="w-full h-[600px] font-mono text-sm p-4 bg-background border rounded-md"
              spellCheck="false"
            />
          </div>

          {(showChat || showRemixSuggestions) && (
            <Card className="w-96 p-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {showRemixSuggestions ? (
                    <div className="space-y-4">
                      <div className="font-semibold mb-4">
                        Choose an improvement to implement:
                      </div>
                      {remixSuggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          onClick={() => handleRemixSelection(suggestion)}
                          variant="outline"
                          className="w-full text-left justify-start h-auto whitespace-normal p-4"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <>
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
                      <form onSubmit={handleChatSubmit} className="mt-4 space-y-2">
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
                    </>
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    </Card>
  );
}