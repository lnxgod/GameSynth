import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useState } from "react";

interface DebugLogsProps {
  logs: string[];
  onDebugError?: (error: string) => void;
}

export function DebugLogs({ logs, onDebugError }: DebugLogsProps) {
  const [processingErrorIndex, setProcessingErrorIndex] = useState<number | null>(null);

  const isErrorLog = (log: string) => {
    return log.includes('Error executing game code') || log.includes('🚨');
  };

  const handleErrorClick = (log: string, index: number) => {
    if (onDebugError && isErrorLog(log)) {
      setProcessingErrorIndex(index);
      // Extract the error message from the log
      const errorMatch = log.match(/Error executing game code: (.+)/);
      if (errorMatch) {
        onDebugError(errorMatch[1]);
        // Reset processing state after a delay to show animation
        setTimeout(() => setProcessingErrorIndex(null), 2000);
      }
    }
  };

  return (
    <Card className="p-4">
      <ScrollArea className="h-[600px] w-full rounded-md border p-4">
        <div className="space-y-2 font-mono text-sm">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`text-muted-foreground p-2 rounded transition-all duration-200 ${
                isErrorLog(log) 
                  ? 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 cursor-pointer group' 
                  : ''
              } ${processingErrorIndex === index ? 'border-2 border-yellow-500' : ''}`}
              onClick={() => handleErrorClick(log, index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">{log}</div>
                {isErrorLog(log) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                      processingErrorIndex === index ? 'opacity-100' : ''
                    }`}
                    disabled={processingErrorIndex !== null}
                  >
                    {processingErrorIndex === index ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Opening Chat...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Ask AI Help
                      </>
                    )}
                  </Button>
                )}
              </div>
              {processingErrorIndex === index && (
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 animate-pulse">
                  💬 Opening chat with AI assistant...
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-muted-foreground italic">No debug logs yet...</div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}