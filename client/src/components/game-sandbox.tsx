import { useState, useEffect, useRef } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  SandpackCodeEditor,
  useSandpack,
  SandpackFiles
} from '@codesandbox/sandpack-react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Code, Loader2 } from 'lucide-react';

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
        onBoot();
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
      
      // Just check for error message with type assertion
      try {
        // Try to detect errors in the message
        if (message.type === 'action' && (message as any).action === 'show-error') {
          onMessage('Sandbox error detected');
          onError();
        }
        
        if ((message as any).error) {
          onMessage('Sandbox error property detected');
          onError();
        }
      } catch (err) {
        // Silently ignore errors from type checking
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

interface SandpackFile {
  code: string;
  active?: boolean;
}

export function GameSandbox({ gameCode, onClose, showCode = false }: GameSandboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showEditor, setShowEditor] = useState(showCode);
  const [editableCode, setEditableCode] = useState<string | null>(gameCode);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [sandpackFiles, setSandpackFiles] = useState<SandpackFiles | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
    }
    canvas { 
      display: block;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: 100%;
      max-height: 100%;
      background-color: #000;
      border: 1px solid #333;
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
    .game-controls {
      position: fixed;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 16px;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }
    .game-controls button {
      background: #555;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .game-controls button:hover {
      background: #777;
    }
  </style>
</head>
<body>
  <div id="errorDisplay"></div>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <script>
    // Error handling
    const errorDisplay = document.getElementById('errorDisplay');
    window.onerror = function(message, source, lineno, colno, error) {
      errorDisplay.style.display = 'block';
      errorDisplay.textContent = 'Error: ' + message + '\\nLine: ' + lineno;
      return true;
    };
    
    try {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      console.log("Game canvas initialized with size:", canvas.width, canvas.height);

      // Set canvas size to fit the window while maintaining aspect ratio
      function resizeCanvas() {
        const aspectRatio = 4/3; // Common game aspect ratio
        let width = Math.min(window.innerWidth * 0.9, 800);
        let height = width / aspectRatio;
        
        // Make sure it fits vertically
        if (height > window.innerHeight * 0.8) {
          height = window.innerHeight * 0.8;
          width = height * aspectRatio;
        }
        
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        console.log("Canvas resized to:", width, height);
      }
      
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      console.log("Running game code...");
      // ========== Game Code ==========
      ${code}
      // ==============================
      console.log("Game code executed successfully");
      
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
        }
      };
      
      setSandpackFiles(files);
      addDebugLog("Initialized sandbox files with HTML5 canvas");
    }
  }, [editableCode]);
  
  // Log on component mount
  useEffect(() => {
    addDebugLog("Component mounted");
  }, []);
  
  // Update code when gameCode prop changes
  useEffect(() => {
    if (gameCode && gameCode !== editableCode) {
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
        active: true
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

  const toggleEditor = () => {
    setShowEditor(!showEditor);
    addDebugLog(`${showEditor ? "Hiding" : "Showing"} code editor`);
  };

  // Show loading placeholder if code or files not ready
  if (!editableCode || !sandpackFiles) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg text-muted-foreground mb-4">Loading game preview...</p>
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
            onClick={toggleEditor} 
            title={showEditor ? "Hide Code" : "Show Code"}
          >
            <Code className="h-4 w-4 mr-2" />
            {showEditor ? "Hide Code" : "Show Code"}
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
          key={refreshTrigger} // Use trigger to force re-render
          customSetup={{
            entry: '/index.html'
          }}
        >
          <SandpackLayout>
            {showEditor && (
              <SandpackCodeEditor 
                showLineNumbers={true}
                showInlineErrors={true}
                wrapContent={true}
                closableTabs={true}
                initMode="immediate"
              />
            )}
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              showNavigator={false}
            />
            <SandpackEventHandler
              onBoot={handlePreviewReady}
              onError={handlePreviewError}
              onMessage={addDebugLog}
            />
          </SandpackLayout>
        </SandpackProvider>
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary" />
            <p>Loading game environment...</p>
          </div>
        )}
        
        {hasError && !isLoading && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive/10 border border-destructive text-destructive p-4 rounded-md max-w-md z-10">
            <p className="text-sm font-medium">An error occurred while loading the game. Check the preview for details.</p>
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