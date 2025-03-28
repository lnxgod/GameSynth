import { useState, useEffect } from "react";
import { Link } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Palette, Sparkles, ImageIcon, ArrowRight } from "lucide-react";

export default function Home() {
  const [gameCode, setGameCode] = useState(() => {
    // Prioritize session storage for most recent code, then local storage
    const sessionCode = sessionStorage.getItem('currentGameCode');
    const localCode = localStorage.getItem('gameCode');
    
    console.log('Home page loaded with session code:', sessionCode ? 'available' : 'not available');
    console.log('Local storage code:', localCode ? 'available' : 'not available');
    
    // Choose the best available code - prioritize session storage as it's most recent
    let codeToUse = '';
    
    if (sessionCode && sessionCode.trim() !== '') {
      console.log('Using session code, length:', sessionCode.length);
      codeToUse = sessionCode;
      
      // Keep storages in sync when we have the most recent code
      if (!localCode || localCode !== sessionCode) {
        localStorage.setItem('gameCode', sessionCode);
        console.log('Syncing session code to local storage');
      }
    } else if (localCode && localCode.trim() !== '') {
      console.log('Using local storage code, length:', localCode.length);
      codeToUse = localCode;
      
      // Keep storages in sync
      sessionStorage.setItem('currentGameCode', localCode);
      console.log('Syncing local code to session storage');
    }
    
    return codeToUse;
  });
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
  const [templateSettings, setTemplateSettings] = useState<any>(() => {
    const savedSettings = localStorage.getItem('templateSettings');
    return savedSettings ? JSON.parse(savedSettings) : null;
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selectedModel') || "gpt-4o";
  });
  const [modelParameters, setModelParameters] = useState<any>(() => {
    const savedParams = localStorage.getItem('modelParameters');
    return savedParams ? JSON.parse(savedParams) : {};
  });
  const [systemPrompt, setSystemPrompt] = useState(
    () => localStorage.getItem('systemPrompt') ||
    `You are an expert game designer and developer. Analyze the given requirements and create detailed implementation plans. 
     Focus on creating engaging, polished games that are fun to play and technically sound.`
  );
  const [analyses, setAnalyses] = useState<any>(() => {
    const savedAnalyses = localStorage.getItem('analyses');
    return savedAnalyses ? JSON.parse(savedAnalyses) : {};
  });
  const [finalDesign, setFinalDesign] = useState<any>(() => {
    const savedDesign = localStorage.getItem('finalDesign');
    return savedDesign ? JSON.parse(savedDesign) : null;
  });
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>(() => {
    const savedMessages = localStorage.getItem('designMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const addDebugLog = (log: string) => {
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${log}`]);
  };

  const handleCodeChange = (newCode: string) => {
    setGameCode(newCode);
    
    // Save to both localStorage and sessionStorage for persistence
    // This ensures code is available to all components consistently
    localStorage.setItem('gameCode', newCode);
    sessionStorage.setItem('currentGameCode', newCode);
    
    console.log('Code updated in editor and saved to both storages');
    addDebugLog("Code updated in editor");
  };

  const handleDebugError = (error: string) => {
    setDebugContext(error);
    setAiOperation({ type: 'Analyzing Error...', active: true });
  };

  // No need for additional useEffect to load code as it's handled in the initial state

  const handleTemplateSelect = (code: string, settings?: any) => {
    setGameCode(code);
    
    console.log('Template selected with code length:', code ? code.length : 0);
    
    // Save to both localStorage and sessionStorage for persistence
    localStorage.setItem('gameCode', code);
    sessionStorage.setItem('currentGameCode', code);
    
    console.log('Template code saved to both storages');
    
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

  useEffect(() => {
    if (templateSettings) {
      localStorage.setItem('templateSettings', JSON.stringify(templateSettings));
    }
  }, [templateSettings]);

  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('modelParameters', JSON.stringify(modelParameters));
  }, [modelParameters]);

  useEffect(() => {
    localStorage.setItem('systemPrompt', systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    localStorage.setItem('analyses', JSON.stringify(analyses));
  }, [analyses]);

  useEffect(() => {
    if (finalDesign) {
      localStorage.setItem('finalDesign', JSON.stringify(finalDesign));
    }
  }, [finalDesign]);

  useEffect(() => {
    localStorage.setItem('designMessages', JSON.stringify(messages));
  }, [messages]);

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

      {/* Asset Mapping Feature Banner */}
      <div className="mb-8 rounded-lg overflow-hidden shadow-lg border border-primary/20">
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-primary/20 p-3 rounded-full mr-4">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Enhance Your Game Visuals</h3>
                <p className="text-muted-foreground max-w-md">
                  Use AI to automatically generate and map custom assets to your game objects
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/asset-mapping-test">
                <Button variant="default" className="gap-2 bg-gradient-to-r from-primary to-purple-600 text-white shadow-md">
                  <Sparkles className="h-4 w-4" />
                  <span>Map Assets to Game</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
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