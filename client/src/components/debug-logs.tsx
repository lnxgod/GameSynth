import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface DebugLogsProps {
  logs: string[];
}

export function DebugLogs({ logs }: DebugLogsProps) {
  return (
    <Card className="p-4">
      <ScrollArea className="h-[600px] w-full rounded-md border p-4">
        <div className="space-y-2 font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="text-muted-foreground">
              {log}
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
