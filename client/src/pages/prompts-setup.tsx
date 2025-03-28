import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info, Terminal, Code, PenTool, Sparkles, BrainCircuit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

// Define specific descriptions and usage information for each prompt type
const promptDescriptions: Record<string, { description: string; usage: string; icon: React.ReactNode }> = {
  DESIGN_ASSISTANT_PROMPT: {
    description: "Controls how the AI analyzes specific game design aspects.",
    usage: "Used when analyzing game aspects like mechanics, visual style, etc. in the Design Assistant tab. This prompt helps the AI break down game concepts into implementable features.",
    icon: <PenTool className="h-5 w-5 text-primary" />
  },
  FINAL_PROMPT_ASSISTANT: {
    description: "Controls how the AI creates the final game design document.",
    usage: "Used when finalizing game design after analyzing all aspects. Creates a comprehensive game design document with core mechanics and technical requirements.",
    icon: <Sparkles className="h-5 w-5 text-primary" />
  },
  SYSTEM_PROMPT: {
    description: "General system prompt for game code generation.",
    usage: "Used when generating game code directly or through the chat interface. Controls the overall approach to code generation.",
    icon: <Code className="h-5 w-5 text-primary" />
  },
  DEBUG_FRIENDLY: {
    description: "Non-technical prompt for debugging and explaining code issues.",
    usage: "Used in Simple Mode to provide friendly, accessible explanations about code and game development concepts.",
    icon: <Info className="h-5 w-5 text-primary" />
  },
  DEBUG_TECHNICAL: {
    description: "Technical prompt for debugging and code modification.",
    usage: "Used in Technical Mode to provide detailed technical explanations and code solutions.",
    icon: <Terminal className="h-5 w-5 text-primary" />
  }
};

export default function PromptsSetupPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  // Fetch prompts
  const { data: prompts, isLoading } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/prompts");
      return res.json();
    }
  });

  // Update prompt mutation
  const updatePrompt = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await apiRequest("PATCH", `/api/prompts/${id}`, { content });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      toast({
        title: "Success",
        description: "Prompt updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handlePromptUpdate = (id: string, content: string) => {
    updatePrompt.mutate({ id, content });
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">System Prompts Setup</CardTitle>
          <CardDescription>
            Configure the AI system prompts used throughout the application. These prompts control how the AI responds to different types of requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="documentation" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="documentation">Documentation</TabsTrigger>
              <TabsTrigger value="edit">Edit Prompts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documentation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BrainCircuit className="mr-2 h-5 w-5" />
                    AI Prompt System Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    The AI Game Creator uses different specialized prompts for different tasks. Each prompt controls how the AI responds to specific types of requests in the application.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {Object.entries(promptDescriptions).map(([id, info]) => (
                      <Card key={id} className="overflow-hidden border border-muted">
                        <CardHeader className="bg-muted/50 p-4">
                          <CardTitle className="text-lg flex items-center">
                            {info.icon}
                            <span className="ml-2">{id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                          <div>
                            <Badge variant="outline" className="mb-2">Description</Badge>
                            <p className="text-sm">{info.description}</p>
                          </div>
                          <div>
                            <Badge variant="outline" className="mb-2">Usage</Badge>
                            <p className="text-sm">{info.usage}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="edit">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-10 w-10 animate-spin" />
                </div>
              ) : (
                <Accordion
                  type="single"
                  value={expandedPrompt || undefined}
                  onValueChange={setExpandedPrompt}
                  className="space-y-4"
                >
                  {prompts?.map((prompt) => {
                    const promptInfo = promptDescriptions[prompt.id];
                    
                    return (
                      <AccordionItem
                        key={prompt.id}
                        value={prompt.id}
                        className="border rounded-lg p-4"
                      >
                        <AccordionTrigger className="flex items-center justify-between">
                          <div className="flex items-center">
                            {promptInfo?.icon}
                            <div className="ml-2">
                              <h3 className="text-lg font-semibold">{prompt.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {promptInfo?.description || prompt.description}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="space-y-4">
                            {promptInfo && (
                              <div className="bg-muted/30 p-4 rounded-md">
                                <h4 className="font-medium mb-2">How this prompt is used:</h4>
                                <p className="text-sm">{promptInfo.usage}</p>
                              </div>
                            )}
                            
                            <Textarea
                              defaultValue={prompt.content}
                              rows={12}
                              className="font-mono text-sm"
                              onChange={(e) => handlePromptUpdate(prompt.id, e.target.value)}
                            />
                            <div className="flex justify-end">
                              <Button
                                onClick={() => handlePromptUpdate(prompt.id, prompt.content)}
                                disabled={updatePrompt.isPending}
                                variant="default"
                              >
                                {updatePrompt.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
