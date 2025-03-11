import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface ApiLog {
  timestamp: string;
  message: string;
  request?: string;
  response?: string;
}

export function ApiLogs() {
  const { data: logs = [] } = useQuery<ApiLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  return (
    <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800">
      <ScrollArea className="h-[600px] w-full rounded-md border-zinc-800 p-4">
        <div className="space-y-4 font-mono text-sm">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className="border-b border-zinc-800 pb-2 transition-all duration-300 hover:bg-zinc-800/30 rounded-lg p-3"
            >
              <div className="text-zinc-400">
                <span className="text-primary">{log.timestamp}:</span> {log.message}
              </div>
              {log.request && (
                <div className="mt-2">
                  <div className="text-xs text-zinc-500">Request:</div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap overflow-x-auto bg-black/20 p-2 rounded">
                    {log.request}
                  </pre>
                </div>
              )}
              {log.response && (
                <div className="mt-2">
                  <div className="text-xs text-zinc-500">Response:</div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap overflow-x-auto bg-black/20 p-2 rounded">
                    {log.response}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-zinc-500 italic text-center py-8">
              No API logs yet...
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}