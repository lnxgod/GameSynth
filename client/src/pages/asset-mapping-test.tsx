import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AssetGenerator } from '../components/asset-generator';
import { AssetMapper } from '../components/asset-mapper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameSandbox } from '../components/game-sandbox';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Code, Wand, Play, ArrowRight, CheckCircle } from 'lucide-react';
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
    const sessionCode = sessionStorage.getItem('currentGameCode');
    const localCode = localStorage.getItem('gameCode');
    
    // Debug logging
    console.log('Asset mapping page loaded with session code:', sessionCode ? 'available' : 'not available');
    console.log('Local storage code:', localCode ? 'available' : 'not available');
    
    // Prioritize session storage, then local storage, then demo
    const currentCode = sessionCode || localCode || demoGameCode;
    setGameCode(currentCode);
    
    // Always ensure both storages are in sync with the most recent code
    if (sessionCode && !localCode) {
      console.log('Syncing session code to local storage');
      localStorage.setItem('gameCode', sessionCode);
    } else if (localCode && !sessionCode) {
      console.log('Syncing local code to session storage');
      sessionStorage.setItem('currentGameCode', localCode);
    }
    
    // Listen for storage events to update if code changes in another tab
    const handleStorageChange = () => {
      const updatedCode = sessionStorage.getItem('currentGameCode') || localStorage.getItem('gameCode') || demoGameCode;
      console.log('Storage event detected, updating code');
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
  
  // Function to launch the game in fullscreen mode
  const [location, navigate] = useLocation();
  const [isLaunching, setIsLaunching] = useState(false);
  
  const launchGame = () => {
    // Determine which code to use - prefer mapped code, fall back to original
    const codeToUse = mappedCode || gameCode;
    
    console.log('Launching game with code:', codeToUse ? 'available' : 'not available');
    console.log('Using mapped code:', mappedCode ? 'yes' : 'no');
    
    // Save the current state to BOTH session storage and local storage
    // This ensures the Run page will always find the latest code
    sessionStorage.setItem('currentGameCode', codeToUse);
    localStorage.setItem('gameCode', codeToUse);
    
    // Show launching state
    setIsLaunching(true);
    
    // Small delay for visual feedback
    setTimeout(() => {
      navigate('/run');
    }, 500);
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Game Asset Enhancer</h1>
          <p className="text-muted-foreground">Generate and map stunning visual assets to improve your game</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDemo} className="flex-shrink-0">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Demo
          </Button>
          {mappedCode && (
            <Button onClick={launchGame} variant="default" className="bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg" disabled={isLaunching}>
              {isLaunching ? (
                <>Loading...</>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run with Assets
                </>
              )}
            </Button>
          )}
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">Enhanced Game Preview</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" /> Assets Applied
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Your game with enhanced visual assets looks much better!
                    </CardDescription>
                  </div>
                  <Button onClick={launchGame} variant="default" className="bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg">
                    <Play className="mr-2 h-4 w-4" />
                    Run Fullscreen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] border rounded-md shadow-inner">
                  <GameSandbox 
                    gameCode={mappedCode} 
                    onClose={() => {}}
                    fullscreen={false}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Code Changes</CardTitle>
                    <CardDescription>
                      See how the asset mapping modified your game code
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Save the current code and return to home
                      localStorage.setItem('gameCode', mappedCode);
                      sessionStorage.setItem('currentGameCode', mappedCode);
                      navigate('/');
                    }}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue to Editor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] rounded-md border p-4 shadow-inner bg-stone-50 dark:bg-stone-900">
                  <pre className="text-sm font-mono whitespace-pre-wrap">{mappedCode}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Your game now has enhanced visuals! You can:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="flex flex-col h-24 p-4 justify-center" onClick={launchGame}>
                    <Play className="h-8 w-8 mb-2 text-primary" />
                    <span>Play Your Game</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col h-24 p-4 justify-center" onClick={() => navigate('/')}>
                    <Code className="h-8 w-8 mb-2 text-primary" />
                    <span>Edit Game Code</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col h-24 p-4 justify-center" onClick={() => setActiveTab('generate')}>
                    <Wand className="h-8 w-8 mb-2 text-primary" />
                    <span>Create More Assets</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}