import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BuildControlsProps {
  gameCode: string;
  onBuildStart?: () => void;
  onBuildComplete?: () => void;
}

export function BuildControls({ gameCode, onBuildStart, onBuildComplete }: BuildControlsProps) {
  const [appName, setAppName] = useState('My Game');
  const [packageName, setPackageName] = useState('com.mygame.app');
  const [keystorePassword, setKeystorePassword] = useState('');
  const [keyAlias, setKeyAlias] = useState('release');
  const [keyPassword, setKeyPassword] = useState('');
  const { toast } = useToast();

  // Real-time package name validation
  const packageNameRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
  const isPackageNameValid = packageNameRegex.test(packageName);

  const buildMutation = useMutation({
    mutationFn: async () => {
      onBuildStart?.();

      // Log the build parameters for debugging
      console.log('Build parameters:', {
        appName,
        packageName,
        keyAlias,
        hasKeystorePassword: !!keystorePassword,
        hasKeyPassword: !!keyPassword
      });

      const res = await apiRequest("POST", "/api/build/android", {
        gameCode,
        appName,
        packageName,
        keystore: {
          password: keystorePassword,
          alias: keyAlias,
          keyPassword: keyPassword
        }
      });
      return res.json();
    },
    onMutate: () => {
      toast({
        title: "Starting Build",
        description: "Preparing your game for Android...",
      });
    },
    onSuccess: (data) => {
      onBuildComplete?.();
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
      toast({
        title: "Build Failed",
        description: error.message || "Failed to build Android APK. Please check the console for details.",
        variant: "destructive",
      });
    },
  });

  const isFormValid = isPackageNameValid && 
    keystorePassword.length >= 6 && 
    keyPassword.length >= 6 && 
    keyAlias.length > 0;

  return (
    <Card className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Build Android App</h2>

      <div className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="appName">App Name</Label>
          <Input
            id="appName"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="My Awesome Game"
            disabled={buildMutation.isPending}
          />
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
            pattern="[a-z][a-z0-9_]*(\.[a-z0-9_]+)+"
            disabled={buildMutation.isPending}
            className={packageName && (isPackageNameValid ? 'border-green-500' : 'border-red-500')}
          />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Package name must:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>Start with a lowercase letter</li>
              <li>Contain at least two segments (e.g., com.example)</li>
              <li>Only use lowercase letters, numbers, and underscores</li>
              <li>Each segment must start with a letter</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-1">
              Example: com.mygame.app
            </p>
          </div>
        </div>

        <div className="space-y-4 mt-6 border-t pt-4">
          <h3 className="text-sm font-medium">Android Signing Configuration</h3>

          <div className="space-y-1">
            <Label htmlFor="keystorePassword">Keystore Password</Label>
            <Input
              id="keystorePassword"
              type="password"
              value={keystorePassword}
              onChange={(e) => setKeystorePassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={buildMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Password for the keystore file (minimum 6 characters)
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="keyAlias">Key Alias</Label>
            <Input
              id="keyAlias"
              value={keyAlias}
              onChange={(e) => setKeyAlias(e.target.value)}
              placeholder="release"
              disabled={buildMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Name to identify your key (default: release)
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="keyPassword">Key Password</Label>
            <Input
              id="keyPassword"
              type="password"
              value={keyPassword}
              onChange={(e) => setKeyPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={buildMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Password for the signing key (minimum 6 characters)
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={() => buildMutation.mutate()}
        disabled={buildMutation.isPending || !isFormValid}
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
            Build Android APK
          </>
        )}
      </Button>
    </Card>
  );
}