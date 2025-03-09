import { Card } from "@/components/ui/card";
import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

interface CodeDisplayProps {
  code: string;
}

export function CodeDisplay({ code }: CodeDisplayProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <Card className="p-4">
      <pre className="language-javascript">
        <code ref={codeRef} className="language-javascript">
          {code}
        </code>
      </pre>
    </Card>
  );
}
