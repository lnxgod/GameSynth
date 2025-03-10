import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { GameCanvas } from "@/components/game-canvas";
import { CodeEditor } from "@/components/code-editor";
import { DebugLogs } from "@/components/debug-logs";
import { ApiLogs } from "@/components/api-logs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [gameCode, setGameCode] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addDebugLog = (log: string) => {
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${log}`]);
  };

  const handleCodeChange = (newCode: string) => {
    setGameCode(newCode);
    addDebugLog("Code updated in editor");
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
        AI Game Creator
      </h1>

      <div className="space-y-8">
        <ChatInterface onCodeReceived={setGameCode} />

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="preview" className="flex-1">Game Preview</TabsTrigger>
            <TabsTrigger value="code" className="flex-1">Code Editor</TabsTrigger>
            <TabsTrigger value="debug" className="flex-1">Debug Logs</TabsTrigger>
            <TabsTrigger value="api" className="flex-1">API Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <GameCanvas code={gameCode} onDebugLog={addDebugLog} />
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <CodeEditor code={gameCode} onCodeChange={handleCodeChange} />
          </TabsContent>

          <TabsContent value="debug" className="mt-4">
            <DebugLogs logs={debugLogs} />
          </TabsContent>

          <TabsContent value="api" className="mt-4">
            <ApiLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}