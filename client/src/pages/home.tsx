import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { GameCanvas } from "@/components/game-canvas";
import { EnhancedCodeEditor } from "@/components/enhanced-code-editor";
import { DebugLogs } from "@/components/debug-logs";
import { ApiLogs } from "@/components/api-logs";
import { GameDesignAssistant } from "@/components/game-design-assistant";
import { FeatureChecklist } from "@/components/feature-checklist";
import { AIStatusIndicator } from "@/components/ai-status-indicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

export default function Home() {
  const [gameCode, setGameCode] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [gameDesign, setGameDesign] = useState<any>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [debugContext, setDebugContext] = useState<string>("");
  const [aiOperation, setAiOperation] = useState<{type: string; active: boolean}>({
    type: '',
    active: false
  });
  const [isNonTechnicalMode, setIsNonTechnicalMode] = useState(false);

  const codeEditorRef = useRef<{ handleDebug: (errorMessage?: string) => void } | null>(null);

  const addDebugLog = (log: string) => {
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${log}`]);
  };

  const handleCodeChange = (newCode: string) => {
    setGameCode(newCode);
    localStorage.setItem('currentGameCode', newCode);
    addDebugLog("Code updated in editor");
  };

  const handleDebugError = (error: string) => {
    setDebugContext(error);
    setAiOperation({ type: 'Analyzing Error...', active: true });

    const codeEditorTab = document.querySelector('[data-tab="code"]');
    if (codeEditorTab instanceof HTMLElement) {
      codeEditorTab.click();
    }

    if (codeEditorRef.current) {
      codeEditorRef.current.handleDebug(error);
    }
  };

  useEffect(() => {
    const handleGameDesignLoad = (e: CustomEvent<any>) => {
      setGameDesign(e.detail);
      addDebugLog("Loaded game design from saved project");
    };

    window.addEventListener('loadGameDesign', handleGameDesignLoad as EventListener);
    return () => {
      window.removeEventListener('loadGameDesign', handleGameDesignLoad as EventListener);
    };
  }, []);

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="flex items-center mb-8">
        <ThemeSwitcher className="mr-4" />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex-1">
          AI Game Creator
        </h1>
        <div className="flex items-center space-x-2">
          <Switch
            id="non-technical-mode"
            checked={isNonTechnicalMode}
            onCheckedChange={setIsNonTechnicalMode}
            className="data-[state=checked]:bg-primary"
          />
          <Label htmlFor="non-technical-mode" className="text-sm">
            {isNonTechnicalMode ? "👥 Simple Mode" : "🔧 Technical Mode"}
          </Label>
        </div>
      </div>

      <div className="space-y-8">
        <Tabs defaultValue="assistant" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="assistant" className="flex-1">Design Assistant</TabsTrigger>
            <TabsTrigger value="direct" className="flex-1">Direct Input</TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="mt-4">
            <GameDesignAssistant
              onCodeGenerated={setGameCode}
              onDesignGenerated={setGameDesign}
              onFeaturesGenerated={setFeatures}
              debugContext={debugContext}
              onAiOperation={setAiOperation}
              isNonTechnicalMode={isNonTechnicalMode}
            />
          </TabsContent>

          <TabsContent value="direct" className="mt-4">
            <ChatInterface 
              onCodeReceived={setGameCode}
              onAiOperation={setAiOperation}
              isNonTechnicalMode={isNonTechnicalMode}
            />
          </TabsContent>
        </Tabs>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="preview" className="flex-1">Game Preview</TabsTrigger>
            <TabsTrigger value="code" className="flex-1" data-tab="code">Code Editor</TabsTrigger>
            <TabsTrigger value="features" className="flex-1">Features</TabsTrigger>
            <TabsTrigger value="debug" className="flex-1">Debug Logs</TabsTrigger>
            <TabsTrigger value="api" className="flex-1">API Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <GameCanvas code={gameCode} onDebugLog={addDebugLog} />
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <EnhancedCodeEditor
              initialCode={gameCode}
              onCodeChange={handleCodeChange}
              readOnly={false}
            />
          </TabsContent>

          <TabsContent value="features" className="mt-4">
            <FeatureChecklist
              gameDesign={gameDesign}
              onCodeUpdate={handleCodeChange}
              initialFeatures={features}
              onAiOperation={setAiOperation}
              isNonTechnicalMode={isNonTechnicalMode}
            />
          </TabsContent>

          <TabsContent value="debug" className="mt-4">
            <DebugLogs 
              logs={debugLogs} 
              onDebugError={handleDebugError}
            />
          </TabsContent>

          <TabsContent value="api" className="mt-4">
            <ApiLogs />
          </TabsContent>
        </Tabs>
      </div>

      <AIStatusIndicator 
        operation={aiOperation.type}
        visible={aiOperation.active}
      />
    </div>
  );
}