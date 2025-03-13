import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PromptManager() {
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [editedPrompt, setEditedPrompt] = useState<string>("");
  const { toast } = useToast();

  const { data: prompts, isLoading: isLoadingPrompts } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/prompts');
      return res.json();
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: async ({ promptKey, newPrompt }: { promptKey: string; newPrompt: string }) => {
      const res = await apiRequest('POST', '/api/prompts', {
        promptKey,
        newPrompt
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prompt updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (selectedPrompt && prompts) {
      setEditedPrompt(prompts[selectedPrompt]);
    }
  }, [selectedPrompt, prompts]);

  const handleSave = () => {
    if (!selectedPrompt || !editedPrompt) return;
    updatePromptMutation.mutate({
      promptKey: selectedPrompt,
      newPrompt: editedPrompt
    });
  };

  if (isLoadingPrompts) {
    return <div>Loading prompts...</div>;
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">System Prompts Manager</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Prompt to Edit</label>
            <Select
              value={selectedPrompt}
              onValueChange={setSelectedPrompt}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a prompt to edit" />
              </SelectTrigger>
              <SelectContent>
                {prompts && Object.keys(prompts).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPrompt && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Edit Prompt</label>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <Button
                onClick={handleSave}
                disabled={updatePromptMutation.isPending}
              >
                {updatePromptMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
