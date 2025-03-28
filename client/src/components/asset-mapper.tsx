import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AIStatusIndicator } from './ai-status-indicator';
import { apiRequest } from '@/lib/queryClient';
import { Code, FileCode, Wand2, Link, Unlink, Eye, PlusCircle, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface ImageAsset {
  url: string;
  prompt: string;
}

interface IconAsset {
  svg: string;
  prompt: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface GameAssetMapping {
  gameObject: string;
  assetType: 'image' | 'icon';
  assetId: number;
  mappingId: string;
  description: string;
}

interface AssetMapperProps {
  gameCode: string;
  onApplyMappings: (mappings: GameAssetMapping[], codeUpdates: string) => void;
}

export function AssetMapper({ gameCode, onApplyMappings }: AssetMapperProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [mappings, setMappings] = useState<GameAssetMapping[]>([]);
  const [gameObjects, setGameObjects] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [imageAssets, setImageAssets] = useState<ImageAsset[]>([]);
  const [iconAssets, setIconAssets] = useState<IconAsset[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Partial<GameAssetMapping> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [codeUpdatePreview, setCodeUpdatePreview] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Load assets from localStorage and automatically analyze game code when component mounts
  useEffect(() => {
    const savedImages = localStorage.getItem('gameImageAssets');
    const savedIcons = localStorage.getItem('gameIconAssets');
    
    if (savedImages) {
      setImageAssets(JSON.parse(savedImages));
    }
    
    if (savedIcons) {
      setIconAssets(JSON.parse(savedIcons));
    }
    
    // If no gameCode is provided, try to load from sessionStorage first, then localStorage
    let codeToAnalyze = gameCode;
    if (!codeToAnalyze || !codeToAnalyze.trim()) {
      const sessionCode = sessionStorage.getItem('currentGameCode');
      const localCode = localStorage.getItem('gameCode');
      codeToAnalyze = sessionCode || localCode || '';
    }
    
    // Automatically analyze game code when component mounts
    if (codeToAnalyze && codeToAnalyze.trim()) {
      // Call the function with explicit parameter
      analyzeGameCode(codeToAnalyze);
    }
  }, [gameCode]);
  
  // Analyze game code to find mappable objects
  const analyzeGameCode = async (codeToAnalyze = gameCode) => {
    if (!codeToAnalyze || !codeToAnalyze.trim()) return;
    
    setAnalyzing(true);
    try {
      const response = await fetch('/api/assets/analyze-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToAnalyze })
      });
      
      if (!response.ok) {
        throw new Error(`Error analyzing game code: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Process the identified game objects
      if (result.gameObjects && Array.isArray(result.gameObjects)) {
        setGameObjects(result.gameObjects);
      } else {
        console.error('Invalid response format:', result);
        setGameObjects([]);
      }
      
    } catch (error) {
      console.error('Error analyzing game code:', error);
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Filter assets based on search term
  const filteredImageAssets = imageAssets.filter(asset => 
    asset.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredIconAssets = iconAssets.filter(asset => 
    asset.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get objects that haven't been mapped yet
  const unmappedObjects = gameObjects.filter(obj => 
    !mappings.some(mapping => mapping.gameObject === obj)
  );
  
  // Handle creating a new mapping
  const handleCreateMapping = (gameObject: string) => {
    setCurrentMapping({
      gameObject,
      assetType: 'image' // default
    });
    setIsDialogOpen(true);
  };
  
  // Handle removing a mapping
  const handleRemoveMapping = (mappingId: string) => {
    setMappings(mappings.filter(m => m.mappingId !== mappingId));
  };
  
  // Save the current mapping
  const saveMapping = () => {
    if (!currentMapping || !currentMapping.gameObject || !currentMapping.assetType || currentMapping.assetId === undefined) {
      return;
    }
    
    const newMapping: GameAssetMapping = {
      gameObject: currentMapping.gameObject,
      assetType: currentMapping.assetType,
      assetId: currentMapping.assetId!,
      mappingId: Date.now().toString(),
      description: currentMapping.description || ''
    };
    
    setMappings([...mappings, newMapping]);
    setCurrentMapping(null);
    setIsDialogOpen(false);
  };
  
  // Preview code changes
  const previewCodeChanges = async () => {
    if (mappings.length === 0) return;
    
    setIsGenerating(true);
    setCodeUpdatePreview('');
    
    try {
      // Prepare the mapping data for the API
      const mappingData = mappings.map(m => {
        // Find the actual asset data based on type and ID
        let assetUrl = '';
        
        if (m.assetType === 'image' && imageAssets[m.assetId]) {
          assetUrl = imageAssets[m.assetId].url;
        } else if (m.assetType === 'icon' && iconAssets[m.assetId]) {
          assetUrl = iconAssets[m.assetId].svg;
        }
          
        // Return a complete mapping object with the asset data
        return {
          gameObject: m.gameObject,
          assetType: m.assetType,
          assetUrl: assetUrl,
          description: m.description
        };
      });
      
      // Try to get the most current code (from session storage or local storage)
      const sessionCode = sessionStorage.getItem('currentGameCode');
      const localCode = localStorage.getItem('gameCode');
      const currentCode = gameCode || sessionCode || localCode || '';
      
      const response = await fetch('/api/assets/generate-code-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameCode: currentCode,
          mappings: mappingData
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.updatedCode) {
        setCodeUpdatePreview(result.updatedCode);
      } else {
        console.error('Invalid server response, missing updatedCode:', result);
      }
      
    } catch (error) {
      console.error('Error generating code updates:', error);
      setCodeUpdatePreview(''); // Clear on error
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Apply the mappings to the game code
  const applyMappings = () => {
    if (mappings.length === 0) return;
    
    onApplyMappings(mappings, codeUpdatePreview);
  };
  
  // Select an asset for mapping
  const selectAsset = (id: number, type: 'image' | 'icon') => {
    if (!currentMapping) return;
    
    setCurrentMapping({
      ...currentMapping,
      assetType: type,
      assetId: id
    });
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Asset Mapping</CardTitle>
          <CardDescription>
            Map your generated assets to game objects for enhanced visuals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button 
                onClick={() => {
                  // Get code from storage if not directly provided
                  const sessionCode = sessionStorage.getItem('currentGameCode');
                  const localCode = localStorage.getItem('gameCode');
                  const codeToUse = gameCode || sessionCode || localCode || '';
                  analyzeGameCode(codeToUse);
                }} 
                disabled={analyzing}
                className="flex items-center"
              >
                <Code className="mr-2 h-4 w-4" />
                {analyzing ? 'Analyzing...' : 'Analyze Game Code'}
              </Button>
              {analyzing && <AIStatusIndicator operation="Analyzing game code" visible={true} />}
            </div>
            
            {gameObjects.length > 0 && (
              <>
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Game Objects</h3>
                    <Badge variant="outline">{gameObjects.length} found</Badge>
                  </div>
                  
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-2">
                      {gameObjects.map((obj, index) => {
                        const isAlreadyMapped = mappings.some(m => m.gameObject === obj);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/10">
                            <div className="flex items-center">
                              <FileCode className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>{obj}</span>
                            </div>
                            {isAlreadyMapped ? (
                              <Badge variant="secondary">Mapped</Badge>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleCreateMapping(obj)}>
                                <PlusCircle className="mr-1 h-3 w-3" />
                                Map Asset
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
            
            {mappings.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Current Mappings</h3>
                  <div className="space-y-2">
                    {mappings.map((mapping) => (
                      <div key={mapping.mappingId} className="flex items-center justify-between p-3 rounded-md border">
                        <div>
                          <div className="font-medium">{mapping.gameObject}</div>
                          <div className="text-sm text-muted-foreground">
                            {mapping.assetType === 'image' 
                              ? imageAssets[mapping.assetId]?.prompt 
                              : iconAssets[mapping.assetId]?.prompt}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveMapping(mapping.mappingId)}>
                            <Unlink className="h-4 w-4" />
                            <span className="sr-only">Remove mapping</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={previewCodeChanges}
                        disabled={isGenerating}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {isGenerating ? 'Generating...' : 'Preview Changes'}
                      </Button>
                      {isGenerating && 
                        <AIStatusIndicator 
                          operation="Generating code updates" 
                          visible={true} 
                        />
                      }
                    </div>
                    <Button 
                      onClick={applyMappings} 
                      disabled={!codeUpdatePreview || isGenerating}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Apply to Game
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {codeUpdatePreview && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Code Update Preview</h3>
                  <div className="rounded-md bg-muted p-4">
                    <ScrollArea className="h-[200px]">
                      <pre className="text-sm font-mono whitespace-pre-wrap">{codeUpdatePreview}</pre>
                    </ScrollArea>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Map Asset to {currentMapping?.gameObject}</DialogTitle>
            <DialogDescription>
              Select an asset to map to this game object
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="description">Mapping Description</Label>
                <Input 
                  id="description" 
                  placeholder="What this mapping does (optional)"
                  value={currentMapping?.description || ''}
                  onChange={(e) => setCurrentMapping(current => current ? {...current, description: e.target.value} : null)}
                />
              </div>
              <div className="w-1/3">
                <Label htmlFor="search">Search Assets</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="search" 
                    placeholder="Search assets..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="images">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="icons">SVG Icons</TabsTrigger>
              </TabsList>
              
              <TabsContent value="images" className="space-y-4 mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredImageAssets.length > 0 ? (
                      filteredImageAssets.map((asset, index) => (
                        <div 
                          key={index} 
                          className={`border rounded-md overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                            currentMapping?.assetType === 'image' && currentMapping?.assetId === index ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => selectAsset(index, 'image')}
                        >
                          <div className="aspect-square relative">
                            <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-2 bg-muted/20">
                            <p className="text-xs truncate" title={asset.prompt}>{asset.prompt}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 text-center p-4 text-muted-foreground">
                        No image assets found. Generate some in the Assets tab.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="icons" className="space-y-4 mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredIconAssets.length > 0 ? (
                      filteredIconAssets.map((asset, index) => (
                        <div 
                          key={index} 
                          className={`border rounded-md overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                            currentMapping?.assetType === 'icon' && currentMapping?.assetId === index ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => selectAsset(index, 'icon')}
                        >
                          <div className="bg-white p-4 flex justify-center">
                            <div 
                              className="w-16 h-16" 
                              dangerouslySetInnerHTML={{ 
                                __html: asset.svg.replace(/fill="[^"]*"/g, (match) => {
                                  // Apply the custom colors
                                  if (asset.colors) {
                                    return `fill="${asset.colors.primary}"`;
                                  }
                                  return match;
                                })
                              }} 
                            />
                          </div>
                          <div className="p-2 bg-muted/20">
                            <p className="text-xs truncate" title={asset.prompt}>{asset.prompt}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 text-center p-4 text-muted-foreground">
                        No icon assets found. Generate some in the Assets tab.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveMapping} 
              disabled={!currentMapping?.assetType || currentMapping?.assetId === undefined}
            >
              <Link className="mr-2 h-4 w-4" />
              Create Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}