import { useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";

interface PlunkerEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

export function PlunkerEditor({ code, onCodeChange }: PlunkerEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!editorRef.current) return;

    // Create the Plunker embed
    const files = {
      'index.html': `<!DOCTYPE html>
<html>
  <head>
    <title>Game Preview</title>
  </head>
  <body>
    <script type="module">
      ${code}
    </script>
  </body>
</html>`,
      'script.js': code
    };

    const plunkerUrl = `https://plnkr.co/edit/?p=preview&open=script.js`;
    
    // Create the iframe
    const iframe = document.createElement('iframe');
    iframe.src = plunkerUrl;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    
    // Add message listener for code updates
    window.addEventListener('message', (event) => {
      if (event.data.type === 'plunker-save') {
        onCodeChange(event.data.code);
      }
    });

    // Clear and append
    editorRef.current.innerHTML = '';
    editorRef.current.appendChild(iframe);

    return () => {
      window.removeEventListener('message', () => {});
    };
  }, [code, onCodeChange]);

  return (
    <Card className="w-full">
      <div ref={editorRef} className="w-full min-h-[600px]" />
    </Card>
  );
}
