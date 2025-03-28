import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AssetGenerator } from '../components/asset-generator';
import { AssetMapper } from '../components/asset-mapper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameSandbox } from '../components/game-sandbox';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Code, Wand, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Fallback demo game in case nothing is loaded
import demoGameCode from '../components/demo-game.html?raw';

export function AssetMappingTest() {
  // Use the active game code directly from session storage
  const [gameCode, setGameCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState('generate');
  const [mappedCode, setMappedCode] = useState<string>('');
  const [isAnalyzingGameCode, setIsAnalyzingGameCode] = useState(false);
  const { toast } = useToast();
  
  // Load the currently active game code
  useEffect(() => {
    // First try to get the code from session storage (most recent workspace code)
    const currentCode = sessionStorage.getItem('currentGameCode') || localStorage.getItem('gameCode') || demoGameCode;
    setGameCode(currentCode);
    
    // Listen for storage events to update if code changes in another tab
    const handleStorageChange = () => {
      const updatedCode = sessionStorage.getItem('currentGameCode') || localStorage.getItem('gameCode') || demoGameCode;
      setGameCode(updatedCode);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Update the session storage with current game code (for other components to access)
  useEffect(() => {
    if (gameCode) {
      sessionStorage.setItem('currentGameCode', gameCode);
    }
  }, [gameCode]);
  
  const handleApplyMappings = (_mappings: any[], updatedCode: string) => {
    if (!updatedCode) return;
    
    setMappedCode(updatedCode);
    
    // Always save the updated code to both storage locations
    localStorage.setItem('gameCode', updatedCode);
    sessionStorage.setItem('currentGameCode', updatedCode);
    
    // Show toast confirmation
    toast({
      title: "Game code updated",
      description: "Your game has been updated with the mapped assets",
      duration: 3000
    });
    
    setActiveTab('preview');
  };
  
  // Function to reset to the demo
  const resetDemo = () => {
    setGameCode(demoGameCode);
    setMappedCode('');
    setActiveTab('generate');
    
    // Update storage
    sessionStorage.setItem('currentGameCode', demoGameCode);
  };
  
  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Automatically trigger game code analysis when switching to the mapping tab
    if (value === 'map' && gameCode && !isAnalyzingGameCode) {
      setIsAnalyzingGameCode(true);
      // We'll rely on the AssetMapper component to handle the analysis
    }
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Asset Mapping Test</h1>
          <p className="text-muted-foreground">Generate and map assets to enhance your game visuals</p>
        </div>
        <Button variant="outline" onClick={resetDemo}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Demo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="generate">1. Generate Assets</TabsTrigger>
          <TabsTrigger value="map">2. Map to Game Objects</TabsTrigger>
          <TabsTrigger value="preview" disabled={!mappedCode}>3. Preview Result</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Game Assets</CardTitle>
              <CardDescription>
                Create images and icons to use in your game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetGenerator />
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => handleTabChange('map')}>
              Continue to Mapping
              <Code className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="map" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Original Game Preview</CardTitle>
                <CardDescription>
                  This is what your game looks like before asset mapping
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] border rounded-md">
                  <GameSandbox 
                    gameCode={gameCode} 
                    onClose={() => {}}
                    fullscreen={false}
                  />
                </div>
              </CardContent>
            </Card>
            
            <AssetMapper gameCode={gameCode} onApplyMappings={handleApplyMappings} />
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enhanced Game Preview</CardTitle>
                  <CardDescription>
                    Your game with mapped visual assets
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-auto">Visual Enhancement Applied</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] border rounded-md">
                <GameSandbox 
                  gameCode={mappedCode} 
                  onClose={() => {}}
                  fullscreen={false}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Code Changes</CardTitle>
              <CardDescription>
                See how the asset mapping modified your game code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">{mappedCode}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}