import { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function CodeEditor({ code, onCodeChange }: CodeEditorProps) {
  const [editorCode, setEditorCode] = useState(code);
  const { toast } = useToast();

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

  const saveCode = () => {
    localStorage.setItem('currentGameCode', editorCode);
    toast({
      title: "Code Saved",
      description: "Your code has been saved. Use the 'Run Game' button in the top navigation to launch it."
    });
  };

  return (
    <div className="h-[calc(100vh-12rem)]">
      <Card className="p-4 h-full">
        <div className="flex justify-end mb-4">
          <Button onClick={saveCode} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
        <Editor
          height="calc(100% - 3rem)"
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
    </div>
  );
}