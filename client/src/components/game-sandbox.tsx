import { useState, useEffect, useRef } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  SandpackCodeEditor,
  useSandpack
} from '@codesandbox/sandpack-react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Code, Loader2 } from 'lucide-react';

// This component handles SandpackPreview events
function SandpackEventHandler({ onBoot, onError }: { onBoot: () => void; onError: () => void }) {
  const { listen } = useSandpack();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const unsubscribe = listen(message => {
      // Handle successful loads
      if (message.type === 'start') {
        onBoot();
      } 
      
      // Special case for 'done' message - this happens when compilation is complete
      if (message.type === 'done') {
        // Give a little time for the preview to fully render
        timeout = setTimeout(() => {
          onBoot();
        }, 500);
      }
      
      // Just check for error message with type assertion, ignore TypeScript complaints
      const msg = message as any;
      if (msg.error) {
        onError();
      }
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [listen, onBoot, onError]);

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
  const [showEditor, setShowEditor] = useState(showCode);
  const [editableCode, setEditableCode] = useState<string | null>(gameCode);
  const isRefreshing = useRef(false);

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
      }
      
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      // ========== Game Code ==========
      ${code}
      // ==============================
      
    } catch (error) {
      errorDisplay.style.display = 'block';
      errorDisplay.textContent = 'Error: ' + error.message;
    }
  </script>
</body>
</html>
    `.trim();
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    isRefreshing.current = true;
  };

  const toggleEditor = () => {
    setShowEditor(!showEditor);
  };

  useEffect(() => {
    if (gameCode && gameCode !== editableCode) {
      setEditableCode(gameCode);
    }
    setIsLoading(true);
    setHasError(false);
  }, [gameCode]);

  const handlePreviewReady = () => {
    setIsLoading(false);
    isRefreshing.current = false;
  };

  const handlePreviewError = () => {
    setHasError(true);
    setIsLoading(false);
    isRefreshing.current = false;
  };

  if (!editableCode) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg text-muted-foreground mb-4">No game code available</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  const files = {
    '/index.html': createGameHTML(editableCode),
    '/game.js': editableCode
  };

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
          files={files}
          template="static"
          theme="dark"
          options={{
            externalResources: [],
            recompileMode: "immediate",
            recompileDelay: 300,
          }}
          key={isRefreshing.current ? Date.now() : undefined}
        >
          <SandpackLayout>
            {showEditor && (
              <SandpackCodeEditor 
                showLineNumbers 
                showInlineErrors 
                wrapContent 
                closableTabs
                readOnly={false}
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
      </div>
    </div>
  );
}