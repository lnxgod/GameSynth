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
        <div className="space-y-2 font-mono text-sm">
          {logs.map((log: { timestamp: string; message: string }, index: number) => (
            <div key={index} className="text-muted-foreground">
              {log.timestamp}: {log.message}
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
