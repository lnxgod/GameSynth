import { useState, useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function CodeEditor({ code, onCodeChange }: CodeEditorProps) {
  const [editorCode, setEditorCode] = useState(code);
  const { toast } = useToast();
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Update editor when code prop changes
  useEffect(() => {
    setEditorCode(code);
  }, [code]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorCode(value);
      onCodeChange(value);
    }
  };

  const runCode = () => {
    if (!previewRef.current) return;

    // Create HTML content with the game code
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              margin: 0; 
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: #1a1a1a;
            }
            canvas { 
              background: #000;
              max-width: 100%;
              max-height: 100%;
            }
            #error-display {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background: rgba(255, 0, 0, 0.9);
              color: white;
              padding: 10px;
              font-family: monospace;
              white-space: pre-wrap;
              display: none;
            }
          </style>
        </head>
        <body>
          <canvas id="gameCanvas"></canvas>
          <div id="error-display"></div>
          <script>
            // Initialize canvas with proper size
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size
            function resizeCanvas() {
              const maxSize = Math.min(window.innerWidth, window.innerHeight) - 40;
              canvas.width = maxSize;
              canvas.height = maxSize;
            }
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            // Error handling
            // Create error display element
            const errorDisplay = document.createElement('div');
            errorDisplay.id = 'error-display';
            errorDisplay.style.cssText = 'display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255, 0, 0, 0.8); color: white; padding: 10px; font-family: monospace; z-index: 1000;';
            document.body.appendChild(errorDisplay);

            window.onerror = function(msg, url, lineNo, columnNo, error) {
              errorDisplay.style.display = 'block';
              errorDisplay.textContent = 'Error: ' + msg + '\nLine: ' + lineNo;
              return false;
            };

            // Clear any previous game loop
            if (window.gameLoop) {
              cancelAnimationFrame(window.gameLoop);
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            try {
              // Run the game code
              ${editorCode}
            } catch (error) {
              errorDisplay.style.display = 'block';
              errorDisplay.textContent = 'Error: ' + error.message;
            }
          </script>
        </body>
      </html>
    `;

    // Write to the iframe
    const iframeDoc = previewRef.current.contentDocument;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
    }

    toast({
      title: "Game Preview Updated",
      description: "Your code is now running in the preview panel",
    });
  };

  const saveCode = () => {
    localStorage.setItem('savedGameCode', editorCode);
    toast({
      title: "Code Saved",
      description: "Your code has been saved to local storage",
    });
  };

  const resetPreview = () => {
    if (previewRef.current) {
      const iframeDoc = previewRef.current.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write('');
        iframeDoc.close();
      }
    }
    runCode();
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[600px]">
      <Card className="p-4">
        <div className="flex justify-between mb-4">
          <Button onClick={runCode}>
            <Play className="mr-2 h-4 w-4" />
            Run Game
          </Button>
          <Button onClick={resetPreview} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={saveCode} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
        <Editor
          height="500px"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={editorCode}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            renderWhitespace: "none",
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </Card>
      <Card className="p-4">
        <iframe 
          ref={previewRef}
          title="Game Preview"
          className="w-full h-full border-none bg-black rounded-lg"
          sandbox="allow-scripts allow-same-origin"
        />
      </Card>
    </div>
  );
}