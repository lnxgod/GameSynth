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
    <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800">
      <ScrollArea className="h-[600px] w-full rounded-md border-zinc-800 p-4">
        <div className="space-y-2 font-mono text-sm">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`p-2 rounded-lg transition-all duration-300 ${
                isErrorLog(log) 
                  ? 'bg-red-500/10 hover:bg-red-500/20 cursor-pointer group' 
                  : 'text-zinc-400'
              } ${processingErrorIndex === index ? 'border-2 border-primary/50 shadow-lg shadow-primary/20' : ''}`}
              onClick={() => handleErrorClick(log, index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">{log}</div>
                {isErrorLog(log) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/20 ${
                      processingErrorIndex === index ? 'opacity-100' : ''
                    }`}
                    disabled={processingErrorIndex !== null}
                  >
                    {processingErrorIndex === index ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin text-primary" />
                        <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                          Opening Chat...
                        </span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-1 text-primary" />
                        <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                          Ask AI Help
                        </span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              {processingErrorIndex === index && (
                <div className="mt-2 text-xs text-primary animate-pulse">
                  💬 Opening chat with AI assistant...
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-zinc-500 italic text-center py-8">
              No debug logs yet...
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}