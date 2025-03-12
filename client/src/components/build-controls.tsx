import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BuildControlsProps {
  gameCode: string;
  onBuildStart?: () => void;
  onBuildComplete?: () => void;
}

export function BuildControls({ gameCode, onBuildStart, onBuildComplete }: BuildControlsProps) {
  const [appName, setAppName] = useState('My Game');
  const [packageName, setPackageName] = useState('com.mygame.app');
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const { toast } = useToast();

  // Real-time package name validation
  const packageNameRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
  const isPackageNameValid = packageNameRegex.test(packageName);

  const buildMutation = useMutation({
    mutationFn: async () => {
      onBuildStart?.();
      setBuildLogs([]);

      console.log('Starting build with:', {
        appName,
        packageName,
        hasGameCode: !!gameCode
      });

      const res = await apiRequest("POST", "/api/build/android", {
        gameCode,
        appName,
        packageName
      });
      return res.json();
    },
    onSuccess: (data) => {
      onBuildComplete?.();
      if (data.logs) {
        setBuildLogs(data.logs);
      }
      if (data.downloadUrl) {
        toast({
          title: "Build Complete",
          description: "Your Android APK is ready for download!",
        });
        window.open(data.downloadUrl, '_blank');
      }
    },
    onError: (error: any) => {
      onBuildComplete?.();
      console.error('Build error:', error);
      if (error.logs) {
        setBuildLogs(error.logs);
      }
      toast({
        title: "Build Failed",
        description: error.message || "Failed to build Android APK. Check the build logs below.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Build Android Debug APK</h2>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="appName">App Name</Label>
          <Input
            id="appName"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="My Awesome Game"
            disabled={buildMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            The name that will appear on the Android device
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="packageName" className="flex items-center justify-between">
            Package Name
            {packageName && (
              <span className={`text-xs ${isPackageNameValid ? 'text-green-500' : 'text-red-500'}`}>
                {isPackageNameValid ? '✓ Valid format' : '✗ Invalid format'}
              </span>
            )}
          </Label>
          <Input
            id="packageName"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="com.mygame.app"
            disabled={buildMutation.isPending}
            className={packageName && (isPackageNameValid ? 'border-green-500' : 'border-red-500')}
          />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Package name must be in reverse domain format:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              <li>Start with lowercase letter</li>
              <li>Use only letters, numbers, and dots</li>
              <li>At least two segments (e.g., com.example)</li>
            </ul>
            <p className="text-xs text-muted-foreground italic">
              Example: com.mygame.app
            </p>
          </div>
        </div>
      </div>

      {buildLogs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Build Logs</h3>
          <ScrollArea className="h-40 w-full rounded-md border bg-muted p-4">
            <pre className="text-xs whitespace-pre-wrap">
              {buildLogs.join('\n')}
            </pre>
          </ScrollArea>
        </div>
      )}

      <Button
        onClick={() => buildMutation.mutate()}
        disabled={buildMutation.isPending || !isPackageNameValid}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800"
      >
        {buildMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Building APK...
          </>
        ) : (
          <>
            <Smartphone className="mr-2 h-4 w-4" />
            Build Debug APK
          </>
        )}
      </Button>
    </Card>
  );
}