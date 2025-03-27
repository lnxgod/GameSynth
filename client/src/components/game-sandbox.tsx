import { useState, useEffect } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  SandpackCodeEditor
} from '@codesandbox/sandpack-react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Code, Loader2 } from 'lucide-react';

interface GameSandboxProps {
  gameCode: string | null;
  onClose: () => void;
  showCode?: boolean;
}

export function GameSandbox({ gameCode, onClose, showCode = false }: GameSandboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showEditor, setShowEditor] = useState(showCode);

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
  </style>
</head>
<body>
  <div id="errorDisplay"></div>
  <canvas id="gameCanvas"></canvas>
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

      // Set canvas size to window size
      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      // Run the game code
      ${code}
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
    // The SandpackProvider will auto refresh when props change
  };

  const toggleEditor = () => {
    setShowEditor(!showEditor);
  };

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [gameCode]);

  if (!gameCode) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg text-muted-foreground mb-4">No game code available</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  const files = {
    '/index.html': createGameHTML(gameCode),
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
          </SandpackLayout>
        </SandpackProvider>
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary" />
            <p>Loading game environment...</p>
          </div>
        )}
      </div>
    </div>
  );
}