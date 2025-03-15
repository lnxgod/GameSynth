import { useState, useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Save } from "lucide-react";
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
            body { margin: 0; overflow: hidden; }
            canvas { display: block; }
          </style>
        </head>
        <body>
          <canvas id="gameCanvas"></canvas>
          <script type="module">
            ${editorCode}
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

  return (
    <div className="grid grid-cols-2 gap-4 h-[600px]">
      <Card className="p-4">
        <div className="flex justify-between mb-4">
          <Button onClick={runCode}>
            <Play className="mr-2 h-4 w-4" />
            Run Game
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
          }}
        />
      </Card>
      <Card className="p-4">
        <iframe 
          ref={previewRef}
          title="Game Preview"
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin"
        />
      </Card>
    </div>
  );
}