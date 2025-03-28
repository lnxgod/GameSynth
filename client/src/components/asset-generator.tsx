import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIStatusIndicator } from './ai-status-indicator';
import { apiRequest } from '@/lib/queryClient';

interface ImageAsset {
  url: string;
  prompt: string;
}

interface IconAsset {
  svg: string;
  prompt: string;
}

export function AssetGenerator() {
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('pixel art');
  const [imageAssets, setImageAssets] = useState<ImageAsset[]>([]);
  const [iconAssets, setIconAssets] = useState<IconAsset[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('images');
  
  const queryClient = useQueryClient();

  const styles = [
    'pixel art',
    'cartoon',
    '3D',
    'hand-drawn',
    'watercolor',
    'retro',
    'minimalist',
    'realistic',
    'isometric'
  ];

  const generateImage = async () => {
    if (!description.trim()) return;
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          style
        })
      });
      
      const result = await response.json();
      setImageAssets([{ url: result.url, prompt: description }, ...imageAssets]);
      setDescription('');
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateIcon = async () => {
    if (!description.trim()) return;
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/assets/icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description
        })
      });
      
      const result = await response.json();
      setIconAssets([{ svg: result.svg, prompt: description }, ...iconAssets]);
      setDescription('');
    } catch (error) {
      console.error('Error generating icon:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    if (activeTab === 'images') {
      generateImage();
    } else {
      generateIcon();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Game Asset Generator</CardTitle>
          <CardDescription>
            Generate custom assets for your game using AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="icons">SVG Icons</TabsTrigger>
            </TabsList>
            
            <TabsContent value="images" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Describe the image you want to generate..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="style">Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((styleOption) => (
                      <SelectItem key={styleOption} value={styleOption}>
                        {styleOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="icons" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="icon-description">Description</Label>
                <Input
                  id="icon-description"
                  placeholder="Describe the icon you want to generate..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-between">
          <div className="flex items-center">
            {generating && <AIStatusIndicator operation="Generating asset" visible={true} />}
          </div>
          <Button onClick={handleGenerateClick} disabled={!description.trim() || generating}>
            Generate
          </Button>
        </CardFooter>
      </Card>

      {activeTab === 'images' && imageAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {imageAssets.map((asset, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  <div className="aspect-square relative">
                    <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 bg-muted/20">
                    <p className="text-sm truncate" title={asset.prompt}>{asset.prompt}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => copyToClipboard(asset.url)}
                    >
                      Copy URL
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'icons' && iconAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Icons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {iconAssets.map((asset, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  <div className="p-4 flex justify-center bg-white">
                    <div 
                      className="w-24 h-24" 
                      dangerouslySetInnerHTML={{ __html: asset.svg }} 
                    />
                  </div>
                  <div className="p-2 bg-muted/20">
                    <p className="text-sm truncate" title={asset.prompt}>{asset.prompt}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => copyToClipboard(asset.svg)}
                    >
                      Copy SVG
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}