import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

type ModelMap = Record<string, string>;

export function ModelSelector() {
  const { auth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: models, isLoading: isLoadingModels } = useQuery<ModelMap>({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/models");
      return res.json();
    }
  });

  const updateModel = useMutation({
    mutationFn: async (model: string) => {
      const res = await apiRequest("PATCH", "/api/users/model-preference", { model });
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
        description: "Model preference updated",
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
    <Select
      value={auth.modelPreference || "gpt-4o"}
      onValueChange={(value) => updateModel.mutate(value)}
      disabled={updateModel.isPending}
    >
      <SelectTrigger className="w-[180px]">
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
  );
}