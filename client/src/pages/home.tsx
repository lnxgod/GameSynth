import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { CodeEditor } from "@/components/code-editor";
import { DebugLogs } from "@/components/debug-logs";
import { ApiLogs } from "@/components/api-logs";
import { GameDesignAssistant } from "@/components/game-design-assistant";
import { FeatureChecklist } from "@/components/feature-checklist";
import { AIStatusIndicator } from "@/components/ai-status-indicator";
import { TemplateLibrary } from "@/components/template-library";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

export default function Home() {
  const [gameCode, setGameCode] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [gameDesign, setGameDesign] = useState<string>("");
  const [features, setFeatures] = useState<string[]>([]);
  const [debugContext, setDebugContext] = useState<string>("");
  const [aiOperation, setAiOperation] = useState<{type: string; active: boolean}>({
    type: '',
    active: false
  });
  const [isNonTechnicalMode, setIsNonTechnicalMode] = useState(false);

  // Design Assistant persistent states
  const [templateSettings, setTemplateSettings] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [modelParameters, setModelParameters] = useState<any>({});
  const [systemPrompt, setSystemPrompt] = useState(
    `You are an expert game designer and developer. Analyze the given requirements and create detailed implementation plans. 
     Focus on creating engaging, polished games that are fun to play and technically sound.`
  );
  const [analyses, setAnalyses] = useState<any>({});
  const [finalDesign, setFinalDesign] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([]);

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
  };

  useEffect(() => {
    const savedCode = localStorage.getItem('currentGameCode');
    if (savedCode) {
      setGameCode(savedCode);
      addDebugLog("Loaded code from local storage");
    }
  }, []);

  const handleTemplateSelect = (code: string, settings?: any) => {
    setGameCode(code);
    if (settings) {
      setTemplateSettings(settings);
      setSelectedModel(settings.modelParameters?.model || selectedModel);
      setModelParameters(settings.modelParameters || modelParameters);
      setSystemPrompt(settings.systemPrompt || systemPrompt);
      if (settings.gameType) {
        setGameDesign(JSON.stringify(settings, null, 2));
      }
    }
    addDebugLog(`Loaded template with settings: ${settings ? JSON.stringify(settings, null, 2) : 'No settings'}`);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="flex items-center mb-8">
        <ThemeSwitcher />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex-1 ml-4">
          AI Game Creator
        </h1>
        <div className="flex items-center space-x-2">
          <Switch
            id="non-technical-mode"
            checked={isNonTechnicalMode}
            onCheckedChange={setIsNonTechnicalMode}
          />
          <Label htmlFor="non-technical-mode">
            {isNonTechnicalMode ? "👥 Simple Mode" : "🔧 Technical Mode"}
          </Label>
        </div>
      </div>

      <div className="space-y-8">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
            <TabsTrigger value="assistant" className="flex-1">Design Assistant</TabsTrigger>
            <TabsTrigger value="direct" className="flex-1">Direct Input</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <TemplateLibrary onTemplateSelect={handleTemplateSelect} />
          </TabsContent>

          <TabsContent value="assistant" className="mt-4">
            <GameDesignAssistant
              onCodeGenerated={setGameCode}
              onDesignGenerated={setGameDesign}
              onFeaturesGenerated={setFeatures}
              debugContext={debugContext}
              onAiOperation={setAiOperation}
              isNonTechnicalMode={isNonTechnicalMode}
              initialSettings={templateSettings}
              selectedModel={selectedModel}
              onSelectedModelChange={setSelectedModel}
              modelParameters={modelParameters}
              onModelParametersChange={setModelParameters}
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
              analyses={analyses}
              onAnalysesChange={setAnalyses}
              finalDesign={finalDesign}
              onFinalDesignChange={setFinalDesign}
              messages={messages}
              onMessagesChange={setMessages}
            />
          </TabsContent>

          <TabsContent value="direct" className="mt-4">
            <ChatInterface 
              onCodeReceived={setGameCode}
              selectedModel={selectedModel}
              onSelectedModelChange={setSelectedModel}
              modelParameters={modelParameters}
              onModelParametersChange={setModelParameters}
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
              onAiOperation={setAiOperation}
              isNonTechnicalMode={isNonTechnicalMode}
            />
          </TabsContent>
        </Tabs>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="editor" className="flex-1">Code Editor</TabsTrigger>
            <TabsTrigger value="features" className="flex-1">Features</TabsTrigger>
            <TabsTrigger value="debug" className="flex-1">Debug Logs</TabsTrigger>
            <TabsTrigger value="api" className="flex-1">API Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-4">
            <CodeEditor
              code={gameCode}
              onCodeChange={handleCodeChange}
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