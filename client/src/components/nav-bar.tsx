import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Play, Settings, X, Loader2, RefreshCw } from "lucide-react";

export function NavBar() {
  const [showGamePreview, setShowGamePreview] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRunGame = () => {
    const gameCode = localStorage.getItem('currentGameCode');
    if (!gameCode) {
      alert("No game code available. Please generate or load a game first.");
      return;
    }

    setShowGamePreview(true);
    setIsLaunching(true);
    setErrorMessage(null);

    // Create an HTML document that includes the game code
    const gameHTML = `
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
            .loading {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.9);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-family: system-ui, sans-serif;
              opacity: 1;
              transition: opacity 0.5s ease;
              z-index: 1000;
            }
            .loading.fade-out {
              opacity: 0;
              pointer-events: none;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .spinner {
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top: 4px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
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
          <div id="loading" class="loading">
            <div style="text-align: center;">
              <div class="spinner"></div>
              <p>Loading game...</p>
            </div>
          </div>
          <div id="errorDisplay"></div>
          <canvas id="gameCanvas"></canvas>
          <script>
            // Error handling
            const errorDisplay = document.getElementById('errorDisplay');
            window.onerror = function(message, source, lineno, colno, error) {
              errorDisplay.style.display = 'block';
              errorDisplay.textContent = 'Error: ' + message + '\\nLine: ' + lineno;
              document.getElementById('loading').classList.add('fade-out');
              return true;
            };
            
            try {
              const canvas = document.getElementById('gameCanvas');
              const ctx = canvas.getContext('2d');
              const loading = document.getElementById('loading');

              // Set canvas size to window size
              function resizeCanvas() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
              }
              window.addEventListener('resize', resizeCanvas);
              resizeCanvas();

              // Remove loading screen after a short delay
              setTimeout(() => {
                loading.classList.add('fade-out');
              }, 1500);

              // Run the game code
              ${gameCode}
            } catch (error) {
              errorDisplay.style.display = 'block';
              errorDisplay.textContent = 'Error: ' + error.message;
            }
          </script>
        </body>
      </html>
    `;

    try {
      // Create a blob and generate URL
      const blob = new Blob([gameHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Set the iframe src
      if (iframeRef.current) {
        iframeRef.current.src = url;

        // Clean up URL after iframe loads
        iframeRef.current.onload = () => {
          URL.revokeObjectURL(url);
          setIsLaunching(false);
        };

        // Handle iframe errors
        iframeRef.current.onerror = () => {
          setErrorMessage("Failed to load the game preview.");
          setIsLaunching(false);
        };
      }
    } catch (error) {
      setErrorMessage(`Error launching game: ${error instanceof Error ? error.message : String(error)}`);
      setIsLaunching(false);
    }
  };

  const handleCloseGamePreview = () => {
    setShowGamePreview(false);
    setIsLaunching(false);
    setErrorMessage(null);
    
    // Clean up iframe src
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
  };

  const handleRetry = () => {
    handleRunGame();
  };

  return (
    <>
      <nav className="border-b bg-background">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-lg font-bold">Game Dev Platform</span>
            </Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <Link href="/prompts-setup">
              <Button variant="ghost">
                <Settings className="mr-2 h-4 w-4" />
                Prompts Setup
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleRunGame}>
              <Play className="mr-2 h-4 w-4" />
              Run Game
            </Button>
          </div>
        </div>
      </nav>
      
      {showGamePreview && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="text-lg font-semibold">Game Preview</h2>
            <div className="flex gap-2">
              {errorMessage && (
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
              <Button variant="outline" onClick={handleCloseGamePreview}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
          <div className="flex-1 relative">
            {errorMessage && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
                <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md max-w-md">
                  <h3 className="font-medium mb-2">Error</h3>
                  <p className="text-sm">{errorMessage}</p>
                </div>
              </div>
            )}
            {isLaunching && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/80">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p>Launching game...</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              id="gameFramePreview"
              className="w-full h-full border-0"
              title="Game Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </>
  );
}