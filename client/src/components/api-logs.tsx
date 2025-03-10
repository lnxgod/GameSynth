import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export function ApiLogs() {
  const { data: logs = [] } = useQuery({
    queryKey: ["/api/logs"],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  return (
    <Card className="p-4">
      <ScrollArea className="h-[600px] w-full rounded-md border p-4">
        <div className="space-y-4 font-mono text-sm">
          {logs.map((log: { timestamp: string; message: string; request?: string; response?: string }, index: number) => (
            <div key={index} className="border-b border-border pb-2">
              <div className="text-muted-foreground">
                {log.timestamp}: {log.message}
              </div>
              {log.request && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Request:</div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap overflow-x-auto">
                    {log.request}
                  </pre>
                </div>
              )}
              {log.response && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Response:</div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap overflow-x-auto">
                    {log.response}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-muted-foreground italic">No API logs yet...</div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}