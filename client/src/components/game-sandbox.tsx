import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Code, Loader2, ExternalLink, Maximize2 } from 'lucide-react';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  SandpackCodeEditor,
  useSandpack,
  SandpackFiles
} from '@codesandbox/sandpack-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// This component handles SandpackPreview events
function SandpackEventHandler({ onBoot, onError, onMessage }: { 
  onBoot: () => void; 
  onError: () => void;
  onMessage: (msg: any) => void;
}) {
  const { listen } = useSandpack();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const unsubscribe = listen(message => {
      // Debug - log all messages
      onMessage(`Sandbox message type: ${message.type}`);
      
      // Handle successful loads
      if (message.type === 'start') {
        onMessage('Sandbox started');
      } 
      
      // Special case for 'done' message - this happens when compilation is complete
      if (message.type === 'done') {
        onMessage('Sandbox compilation done');
        // Give a little time for the preview to fully render
        timeout = setTimeout(() => {
          onBoot();
        }, 500);
      }
      
      // Console messages from sandbox
      if (message.type === 'console' && 'data' in message) {
        try {
          let logText = 'Console:';
          
          // Handle different console message formats
          if (Array.isArray(message.data)) {
            logText += ' ' + message.data.map((item: any) => 
              typeof item === 'object' ? JSON.stringify(item) : String(item)
            ).join(' ');
          } else if (message.data) {
            logText += ' ' + String(message.data);
          }
          
          onMessage(logText);
        } catch (err) {
          onMessage(`Console log could not be parsed`);
        }
      }
      
      // Error detection - safely handle different message formats
      if ((message as any).error || 
         (message.type === 'action' && (message as any).action === 'show-error')) {
        onMessage('Sandbox error detected');
        onError();
      }
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [listen, onBoot, onError, onMessage]);

  return null;
}

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
  const [sandpackFiles, setSandpackFiles] = useState<SandpackFiles | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState(showCode ? "code" : "preview");

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
  
  // Initialize files when code is available
  useEffect(() => {
    if (editableCode) {
      const files = {
        '/index.html': {
          code: createGameHTML(editableCode),
          active: true
        },
        '/game.js': {
          code: editableCode,
          active: false
        }
      };
      
      setSandpackFiles(files);
      addDebugLog("Initialized sandbox files");
    }
  }, [editableCode]);
  
  // Log on component mount
  useEffect(() => {
    addDebugLog("Game sandbox component mounted");
  }, []);
  
  // Update code when gameCode prop changes - only run on mount and when gameCode changes
  useEffect(() => {
    if (gameCode) {
      setEditableCode(gameCode);
      addDebugLog("Game code updated from props");
      setIsLoading(true);
      setHasError(false);
    }
  }, [gameCode]);
  
  const handleRefresh = () => {
    if (!editableCode) return;
    
    addDebugLog("Refreshing sandbox");
    setIsLoading(true);
    setHasError(false);
    
    // Update files and trigger a refresh
    const updatedFiles = {
      '/index.html': {
        code: createGameHTML(editableCode),
        active: activeTab === "preview"
      },
      '/game.js': {
        code: editableCode,
        active: activeTab === "code"
      }
    };
    
    setSandpackFiles(updatedFiles);
    setRefreshTrigger(prev => prev + 1); // Force re-render of SandpackProvider
  };

  const handlePreviewReady = () => {
    addDebugLog("Preview ready");
    setIsLoading(false);
  };

  const handlePreviewError = () => {
    addDebugLog("Preview error occurred");
    setHasError(true);
    setIsLoading(false);
  };

  const openInNewWindow = () => {
    // Create a standalone HTML file with the game code
    if (!editableCode) return;
    
    const htmlContent = createGameHTML(editableCode);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in a new window
    window.open(url, '_blank', 'width=850,height=650');
    
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (sandpackFiles) {
      const updatedFiles = {
        ...sandpackFiles,
        '/game.js': {
          ...sandpackFiles['/game.js'],
          active: value === "code"
        }
      };
      setSandpackFiles(updatedFiles);
    }
  };

  // Initialize sandbox files
  useEffect(() => {
    if (editableCode) {
      const files: SandpackFiles = {
        '/index.html': {
          code: `<!DOCTYPE html>
<html>
  <head>
    <style>
      body { margin: 0; overflow: hidden; background: black; }
      canvas { 
        display: block;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 100vw;
        max-height: 100vh;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script type="module" src="/game.js"></script>
  </body>
</html>`,
          hidden: true
        },
        '/game.js': {
          code: editableCode,
          active: true
        }
      };
      setSandpackFiles(files);
    }
  }, [editableCode]);

  // Show loading placeholder if files not ready
  if (!sandpackFiles) {
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
            onClick={handleRefresh} 
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
            <SandpackProvider
              files={sandpackFiles}
              template="vanilla"
              theme="dark"
              options={{
                externalResources: [],
                recompileMode: "immediate",
                recompileDelay: 300,
              }}
              key={refreshTrigger}
              customSetup={{
                entry: '/index.html'
              }}
            >
              <TabsContent value="preview" className="flex-1 h-full m-0 p-0">
                <div className="h-full flex flex-col">
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    showNavigator={false}
                    className="flex-grow"
                  />
                  <SandpackEventHandler
                    onBoot={handlePreviewReady}
                    onError={handlePreviewError}
                    onMessage={addDebugLog}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="code" className="flex-1 h-full m-0 p-0">
                <SandpackCodeEditor 
                  showLineNumbers={true}
                  showInlineErrors={true}
                  wrapContent={true}
                  closableTabs={true}
                  initMode="immediate"
                  className="h-full"
                />
              </TabsContent>
            </SandpackProvider>
          </div>
        </Tabs>
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary" />
            <p>Loading game environment...</p>
          </div>
        )}
        
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