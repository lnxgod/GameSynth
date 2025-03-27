import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Code, Loader2, ExternalLink, Maximize2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';

interface GameSandboxProps {
  gameCode: string | null;
  onClose: () => void;
  showCode?: boolean;
}

export function GameSandbox({ gameCode, onClose, showCode = false }: GameSandboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [editableCode, setEditableCode] = useState<string | null>(gameCode);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(showCode ? "code" : "preview");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Logging helper
  const addDebugLog = (log: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
    console.log(`[GameSandbox] ${log}`);
  };

  // Create the full HTML with the game code embedded
  const createGameHTML = (code: string) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Preview</title>
  <style>
    body { 
      margin: 0; 
      overflow: hidden; 
      background: #121212; 
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }
    canvas { 
      background-color: #000;
      border: 1px solid #333;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    #errorDisplay {
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 2000;
      display: none;
      white-space: pre-wrap;
      max-height: 50%;
      overflow-y: auto;
    }
    #container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      max-width: 800px;
      max-height: 600px;
    }
  </style>
</head>
<body>
  <div id="errorDisplay"></div>
  <div id="container">
    <canvas id="gameCanvas" width="800" height="600"></canvas>
  </div>
  
  <script>
    // Error handling
    const errorDisplay = document.getElementById('errorDisplay');
    window.onerror = function(message, source, lineno, colno, error) {
      errorDisplay.style.display = 'block';
      errorDisplay.textContent = 'Error: ' + message + '\\nLine: ' + lineno;
      console.error('Game error:', message, 'Line:', lineno);
      return true;
    };
    
    try {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      
      // Responsive canvas sizing
      function resizeCanvas() {
        const container = document.getElementById('container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Maintain aspect ratio
        const aspectRatio = canvas.width / canvas.height;
        let width = Math.min(containerWidth, 800);
        let height = width / aspectRatio;
        
        if (height > containerHeight) {
          height = containerHeight;
          width = height * aspectRatio;
        }
        
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        console.log("Canvas sized to:", width, height);
      }
      
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();
      
      console.log("Game environment initialized");
      
      // ========== User Game Code ==========
      ${code}
      // ====================================
      
    } catch (error) {
      console.error("Game code execution error:", error);
      errorDisplay.style.display = 'block';
      errorDisplay.textContent = 'Error: ' + error.message;
    }
  </script>
</body>
</html>
    `.trim();
  };
  
  // Handle code changes from editor
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableCode(e.target.value);
  };
  
  // Update code when gameCode prop changes
  useEffect(() => {
    if (gameCode) {
      setEditableCode(gameCode);
      addDebugLog("Game code updated from props");
    }
  }, [gameCode]);
  
  // Handle iframe load events
  useEffect(() => {
    const iframe = iframeRef.current;
    
    // Event handler for when iframe loads
    const handleLoad = () => {
      setIsLoading(false);
      addDebugLog("Game preview loaded");
    };
    
    // Event handler for iframe errors
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
      addDebugLog("Error loading game preview");
    };
    
    // Add event listeners
    if (iframe) {
      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('error', handleError);
      
      // Log mount
      addDebugLog("Game sandbox mounted");
    }
    
    // Clean up
    return () => {
      if (iframe) {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      }
    };
  }, []);
  
  // When editableCode changes and we're in preview tab, update the iframe
  useEffect(() => {
    if (editableCode && activeTab === 'preview') {
      refreshPreview();
    }
  }, [editableCode, activeTab]);
  
  // Refresh the preview iframe
  const refreshPreview = () => {
    if (!editableCode || !iframeRef.current) return;
    
    setIsLoading(true);
    setHasError(false);
    addDebugLog("Refreshing game preview");
    
    // Create a data URL from the HTML content
    const htmlContent = createGameHTML(editableCode);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Update the iframe src
    iframeRef.current.src = url;
    
    // Clean up the URL after it's loaded
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  
  // Open game in new window
  const openInNewWindow = () => {
    if (!editableCode) return;
    
    const htmlContent = createGameHTML(editableCode);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in a new window
    window.open(url, '_blank', 'width=850,height=650');
    
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  
  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // If switching to preview, refresh it
    if (value === 'preview') {
      refreshPreview();
    }
  };

  // Show loading placeholder if code not ready
  if (!editableCode) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground mb-4">Preparing game preview...</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="p-4 flex justify-between items-center border-b">
        <h2 className="text-lg font-semibold">Game Preview</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPreview} 
            title="Refresh Preview"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openInNewWindow} 
            title="Open in New Window"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            New Window
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose} 
            title="Close Preview"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="preview" className="flex-1 h-full m-0 p-0 relative">
              <iframe 
                ref={iframeRef}
                className="w-full h-full border-0"
                title="Game Preview"
                sandbox="allow-scripts allow-same-origin"
              />
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                  <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary" />
                  <p>Loading game environment...</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="code" className="flex-1 h-full m-0 p-0">
              <Textarea
                value={editableCode}
                onChange={handleCodeChange}
                className="w-full h-full p-4 font-mono text-sm border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ minHeight: '100%' }}
              />
            </TabsContent>
          </div>
        </Tabs>
        
        {hasError && !isLoading && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive/10 border border-destructive text-destructive p-4 rounded-md max-w-md z-10">
            <p className="text-sm font-medium">An error occurred while loading the game. Check the console for details.</p>
          </div>
        )}
        
        {/* Debug logs panel - collapsible */}
        <div className="absolute bottom-4 right-4 max-w-xs z-20">
          <div className="bg-slate-900/90 border border-slate-700 rounded-md p-2 shadow-lg text-xs font-mono overflow-y-auto max-h-40">
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Debug Logs:</h3>
            <div className="text-slate-400">
              {debugLogs.map((log, i) => (
                <div key={i} className="truncate hover:whitespace-normal">{log}</div>
              ))}
              {debugLogs.length === 0 && <div>No logs yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}