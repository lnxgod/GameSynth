import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

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
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Configure the system prompts used throughout the application. These prompts guide the AI in generating responses for different features.
          </p>
          
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Accordion
              type="single"
              value={expandedPrompt || undefined}
              onValueChange={setExpandedPrompt}
              className="space-y-4"
            >
              {prompts?.map((prompt) => (
                <AccordionItem
                  key={prompt.id}
                  value={prompt.id}
                  className="border rounded-lg p-4"
                >
                  <AccordionTrigger className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{prompt.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {prompt.description}
                      </p>
                      <div className="mt-1">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {prompt.category}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      <Textarea
                        defaultValue={prompt.content}
                        rows={10}
                        className="font-mono"
                        onChange={(e) => handlePromptUpdate(prompt.id, e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => handlePromptUpdate(prompt.id, prompt.content)}
                          disabled={updatePrompt.isPending}
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
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
