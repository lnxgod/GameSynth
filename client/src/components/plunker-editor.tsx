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

    // Create initial HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>Game Preview</title>
    <style>
      body { margin: 0; overflow: hidden; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="game-container"></div>
    <script type="module">
      ${code}
    </script>
  </body>
</html>`;

    // Create form to submit to Plunker
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://plnkr.co/edit/?p=preview';
    form.target = 'plunker-editor';

    // Add files
    const files = {
      'index.html': htmlContent,
      'script.js': code
    };

    Object.entries(files).forEach(([filename, content]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `files[${filename}]`;
      input.value = content;
      form.appendChild(input);
    });

    // Clear and append iframe
    editorRef.current.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.name = 'plunker-editor';
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    editorRef.current.appendChild(iframe);

    // Submit form
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    // Listen for Plunker messages
    const messageHandler = (event: MessageEvent) => {
      if (event.origin === 'https://plnkr.co' && event.data.type === 'edit') {
        onCodeChange(event.data.content);
      }
    };

    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [code]);

  return (
    <Card className="w-full">
      <div ref={editorRef} className="w-full min-h-[600px]" />
    </Card>
  );
}