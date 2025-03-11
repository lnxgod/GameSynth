import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";

interface DebugLogsProps {
  logs: string[];
  onDebugError?: (error: string) => void;
}

export function DebugLogs({ logs, onDebugError }: DebugLogsProps) {
  const isErrorLog = (log: string) => {
    return log.includes('Error executing game code') || log.includes('🚨');
  };

  const handleErrorClick = (log: string) => {
    if (onDebugError && isErrorLog(log)) {
      // Extract the error message from the log
      const errorMatch = log.match(/Error executing game code: (.+)/);
      if (errorMatch) {
        onDebugError(errorMatch[1]);
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
              className={`text-muted-foreground p-2 rounded ${
                isErrorLog(log) 
                  ? 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 cursor-pointer group flex items-center justify-between' 
                  : ''
              }`}
              onClick={() => handleErrorClick(log)}
            >
              {log}
              {isErrorLog(log) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Bug className="h-4 w-4 mr-1" />
                  Fix Error
                </Button>
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