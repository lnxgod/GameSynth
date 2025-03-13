import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelParameterControlsProps {
  model: string;
  onParametersChange: (params: Record<string, any>) => void;
}

export function ModelParameterControls({
  model,
  onParametersChange,
}: ModelParameterControlsProps) {
  const [enabledParameters, setEnabledParameters] = useState<Record<string, boolean>>({});
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

  const { data: parameters, isLoading } = useQuery({
    queryKey: ['model-parameters', model],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/model-parameters/${model}`);
      return res.json();
    },
    enabled: !!model
  });

  useEffect(() => {
    if (parameters) {
      // Reset parameters when model changes
      const newValues: Record<string, any> = {};
      const newEnabled: Record<string, boolean> = {};
      
      Object.entries(parameters).forEach(([param, config]: [string, any]) => {
        newValues[param] = config.default;
        newEnabled[param] = false;
      });
      
      setParameterValues(newValues);
      setEnabledParameters(newEnabled);
    }
  }, [parameters]);

  useEffect(() => {
    const activeParams: Record<string, any> = {};
    Object.entries(enabledParameters).forEach(([param, isEnabled]) => {
      if (isEnabled) {
        activeParams[param] = parameterValues[param];
      }
    });
    onParametersChange(activeParams);
  }, [enabledParameters, parameterValues]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!parameters) {
    return <div>No configurable parameters for this model</div>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(parameters).map(([param, config]: [string, any]) => (
        <div key={param} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`enable-${param}`}
                checked={enabledParameters[param] ?? false}
                onCheckedChange={(checked) => {
                  setEnabledParameters(prev => ({
                    ...prev,
                    [param]: checked as boolean
                  }));
                }}
              />
              <label
                htmlFor={`enable-${param}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {param.split('_').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </label>
            </div>

            {config.type === "float" || config.type === "integer" ? (
              <div className="w-64">
                <Slider
                  value={[parameterValues[param] as number || config.default]}
                  onValueChange={([value]) => {
                    setParameterValues(prev => ({
                      ...prev,
                      [param]: value
                    }));
                  }}
                  disabled={!enabledParameters[param]}
                  min={config.min}
                  max={config.max}
                  step={config.type === "float" ? 0.1 : 1}
                  className="w-full"
                />
              </div>
            ) : config.type === "enum" ? (
              <Select
                value={parameterValues[param] as string}
                onValueChange={(value) => {
                  setParameterValues(prev => ({
                    ...prev,
                    [param]: value
                  }));
                }}
                disabled={!enabledParameters[param]}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.values.map((value: string) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground pl-6">
            {config.description}
          </div>
        </div>
      ))}
    </div>
  );
}
