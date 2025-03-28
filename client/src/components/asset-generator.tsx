import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AIStatusIndicator } from './ai-status-indicator';
import { apiRequest } from '@/lib/queryClient';
import { Palette, Copy, Download, Undo, Check, Trash } from 'lucide-react';

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

// CustomizableIcon component for interactive SVG customization
function CustomizableIcon({ 
  svg, 
  colors = { primary: '#000000', secondary: '#666666', accent: '#4299e1' },
  onColorsChange
}: { 
  svg: string;
  colors?: { primary: string; secondary: string; accent: string };
  onColorsChange?: (colors: { primary: string; secondary: string; accent: string }) => void;
}) {
  const [activeColor, setActiveColor] = useState<'primary' | 'secondary' | 'accent'>('primary');
  const [customColors, setCustomColors] = useState(colors);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);
  
  // Update SVG colors based on customColors state
  useEffect(() => {
    if (svgRef.current) {
      const svgElement = svgRef.current.querySelector('svg');
      if (svgElement) {
        // Apply primary color to paths and shapes
        const paths = svgElement.querySelectorAll('path, circle, rect, ellipse, polygon');
        paths.forEach((path, index) => {
          // Apply different colors to different parts based on index
          if (index % 3 === 0) {
            path.setAttribute('fill', customColors.primary);
          } else if (index % 3 === 1) {
            path.setAttribute('fill', customColors.secondary);
          } else {
            path.setAttribute('fill', customColors.accent);
          }
        });
        
        // If no paths have different colors, set all to primary
        if (paths.length <= 1) {
          paths.forEach(path => {
            path.setAttribute('fill', customColors.primary);
          });
        }
      }
    }
  }, [customColors, svg]);
  
  // Notify parent component of color changes
  useEffect(() => {
    if (onColorsChange) {
      onColorsChange(customColors);
    }
  }, [customColors, onColorsChange]);
  
  const handleColorChange = (color: string) => {
    setCustomColors({ ...customColors, [activeColor]: color });
  };
  
  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleColorChange(e.target.value);
  };
  
  const handleCopySVG = () => {
    if (svgRef.current) {
      const svgElement = svgRef.current.querySelector('svg');
      if (svgElement) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        navigator.clipboard.writeText(svgString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };
  
  // Download SVG with current colors
  const handleDownloadSVG = () => {
    if (svgRef.current) {
      const svgElement = svgRef.current.querySelector('svg');
      if (svgElement) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom-icon.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-md flex justify-center items-center">
        <div 
          ref={svgRef} 
          className="w-32 h-32 transition-all duration-300" 
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      </div>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant={activeColor === 'primary' ? 'default' : 'outline'} 
            className="flex-1"
            onClick={() => setActiveColor('primary')}
            style={{ backgroundColor: activeColor === 'primary' ? undefined : customColors.primary }}
          >
            Primary
          </Button>
          <Button 
            size="sm" 
            variant={activeColor === 'secondary' ? 'default' : 'outline'} 
            className="flex-1"
            onClick={() => setActiveColor('secondary')}
            style={{ backgroundColor: activeColor === 'secondary' ? undefined : customColors.secondary }}
          >
            Secondary
          </Button>
          <Button 
            size="sm" 
            variant={activeColor === 'accent' ? 'default' : 'outline'} 
            className="flex-1"
            onClick={() => setActiveColor('accent')}
            style={{ backgroundColor: activeColor === 'accent' ? undefined : customColors.accent }}
          >
            Accent
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input 
              type="color" 
              value={customColors[activeColor]} 
              onChange={handleColorInput}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input 
              value={customColors[activeColor]} 
              onChange={handleColorInput}
              className="font-mono"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Drag the sliders to adjust color values</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                let resetColor = '#000000';
                if (activeColor === 'secondary') resetColor = '#666666';
                if (activeColor === 'accent') resetColor = '#4299e1';
                handleColorChange(resetColor);
              }}
            >
              <Undo className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <Label>Red</Label>
                <span>{parseInt(customColors[activeColor].slice(1, 3), 16)}</span>
              </div>
              <Slider 
                min={0} 
                max={255} 
                step={1}
                value={[parseInt(customColors[activeColor].slice(1, 3), 16)]}
                onValueChange={(value) => {
                  const r = value[0].toString(16).padStart(2, '0');
                  const g = customColors[activeColor].slice(3, 5);
                  const b = customColors[activeColor].slice(5, 7);
                  handleColorChange(`#${r}${g}${b}`);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <Label>Green</Label>
                <span>{parseInt(customColors[activeColor].slice(3, 5), 16)}</span>
              </div>
              <Slider 
                min={0} 
                max={255} 
                step={1}
                value={[parseInt(customColors[activeColor].slice(3, 5), 16)]}
                onValueChange={(value) => {
                  const r = customColors[activeColor].slice(1, 3);
                  const g = value[0].toString(16).padStart(2, '0');
                  const b = customColors[activeColor].slice(5, 7);
                  handleColorChange(`#${r}${g}${b}`);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <Label>Blue</Label>
                <span>{parseInt(customColors[activeColor].slice(5, 7), 16)}</span>
              </div>
              <Slider 
                min={0} 
                max={255} 
                step={1}
                value={[parseInt(customColors[activeColor].slice(5, 7), 16)]}
                onValueChange={(value) => {
                  const r = customColors[activeColor].slice(1, 3);
                  const g = customColors[activeColor].slice(3, 5);
                  const b = value[0].toString(16).padStart(2, '0');
                  handleColorChange(`#${r}${g}${b}`);
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleCopySVG}
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copied!' : 'Copy SVG'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleDownloadSVG}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AssetGenerator() {
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('pixel art');
  const [imageAssets, setImageAssets] = useState<ImageAsset[]>(() => {
    const saved = localStorage.getItem('gameImageAssets');
    return saved ? JSON.parse(saved) : [];
  });
  const [iconAssets, setIconAssets] = useState<IconAsset[]>(() => {
    const saved = localStorage.getItem('gameIconAssets');
    return saved ? JSON.parse(saved) : [];
  });
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('images');
  
  // Save assets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gameImageAssets', JSON.stringify(imageAssets));
  }, [imageAssets]);
  
  useEffect(() => {
    localStorage.setItem('gameIconAssets', JSON.stringify(iconAssets));
  }, [iconAssets]);
  
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
      const defaultColors = { 
        primary: '#000000', 
        secondary: '#666666', 
        accent: '#4299e1' 
      };
      
      setIconAssets([{ 
        svg: result.svg, 
        prompt: description, 
        colors: defaultColors 
      }, ...iconAssets]);
      
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
  
  const deleteImageAsset = (index: number) => {
    const newAssets = [...imageAssets];
    newAssets.splice(index, 1);
    setImageAssets(newAssets);
  };
  
  const deleteIconAsset = (index: number) => {
    const newAssets = [...iconAssets];
    newAssets.splice(index, 1);
    setIconAssets(newAssets);
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Images</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setImageAssets([])}
            >
              <Trash className="h-4 w-4 mr-1" />
              Clear All
            </Button>
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
                    <div className="flex space-x-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => copyToClipboard(asset.url)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy URL
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-none"
                        onClick={() => deleteImageAsset(index)}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'icons' && iconAssets.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Icons</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Customize colors for game integration</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIconAssets([])}
              >
                <Trash className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {iconAssets.map((asset, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  <div className="p-4 bg-muted/10">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <p className="text-sm font-medium">{asset.prompt}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => deleteIconAsset(index)}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                    <CustomizableIcon 
                      svg={asset.svg} 
                      colors={asset.colors}
                      onColorsChange={(newColors) => {
                        const updatedAssets = [...iconAssets];
                        updatedAssets[index] = {
                          ...updatedAssets[index],
                          colors: newColors
                        };
                        setIconAssets(updatedAssets);
                      }}
                    />
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