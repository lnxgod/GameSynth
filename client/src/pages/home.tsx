import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { GameCanvas } from "@/components/game-canvas";
import { CodeDisplay } from "@/components/code-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [gameCode, setGameCode] = useState("");

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
        AI Game Creator
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <ChatInterface onCodeReceived={setGameCode} />
          
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="preview" className="flex-1">Game Preview</TabsTrigger>
              <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <GameCanvas code={gameCode} />
            </TabsContent>
            <TabsContent value="code">
              <CodeDisplay code={gameCode} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:block">
          <GameCanvas code={gameCode} />
          <div className="mt-8">
            <CodeDisplay code={gameCode} />
          </div>
        </div>
      </div>
    </div>
  );
}
