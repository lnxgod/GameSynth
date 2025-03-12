import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";

type ModelMap = Record<string, string>;

type ModelPreferences = {
  analysisModel: string;
  codeGenModel: string;
};

export function ConfigMenu() {
  const { auth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<ModelPreferences>({
    analysisModel: auth.modelPreference || "gpt-4o",
    codeGenModel: auth.modelPreference || "gpt-4o"
  });

  const { data: models, isLoading: isLoadingModels } = useQuery<ModelMap>({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/models");
      return res.json();
    }
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: ModelPreferences) => {
      const res = await apiRequest("PATCH", "/api/users/model-preferences", prefs);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "Model preferences updated",
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

  if (isLoadingModels) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Analysis Model</label>
          <Select
            value={preferences.analysisModel}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, analysisModel: value }))}
            disabled={updatePreferences.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models && Object.entries(models).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {String(name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Code Generation Model</label>
          <Select
            value={preferences.codeGenModel}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, codeGenModel: value }))}
            disabled={updatePreferences.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models && Object.entries(models).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {String(name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          className="w-full"
          onClick={() => updatePreferences.mutate(preferences)}
          disabled={updatePreferences.isPending}
        >
          {updatePreferences.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
