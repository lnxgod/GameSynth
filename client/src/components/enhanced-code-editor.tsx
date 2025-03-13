import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  FileCode,
  Save,
  Plus,
  X,
  ExternalLink,
  GitBranch,
  History,
  RotateCcw,
  Settings,
  Loader2
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import Editor from "@monaco-editor/react";
import { SystemPromptEditor } from "./system-prompt-editor";

interface Version {
  timestamp: number;
  files: FileVersion[];
}

interface FileVersion {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface EnhancedCodeEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

export function EnhancedCodeEditor({
  initialCode = "",
  onCodeChange,
  readOnly = false
}: EnhancedCodeEditorProps) {
  const { auth } = useAuth();
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [versions, setVersions] = useState<Version[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialCode && files.length === 0) {
      const initialFile: CodeFile = {
        id: crypto.randomUUID(),
        name: "main.js",
        content: initialCode,
        language: "javascript"
      };
      setFiles([initialFile]);
      setActiveFileId(initialFile.id);
      createVersion([initialFile]); // Create initial version
    }
  }, [initialCode]);

  const createVersion = (currentFiles: CodeFile[]) => {
    const newVersion: Version = {
      timestamp: Date.now(),
      files: currentFiles.map(file => ({
        id: file.id,
        name: file.name,
        content: file.content,
        language: file.language
      }))
    };
    setVersions(prev => [...prev, newVersion]);
  };

  const handleFileChange = (fileId: string, newContent: string) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === fileId
          ? { ...file, content: newContent }
          : file
      )
    );

    if (onCodeChange && fileId === activeFileId) {
      onCodeChange(newContent);
    }
  };

  const addNewFile = () => {
    const newFile: CodeFile = {
      id: crypto.randomUUID(),
      name: "untitled.js",
      content: "",
      language: "javascript"
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files[0]?.id || null);
    }
  };

  const renameFile = (fileId: string, newName: string) => {
    setFiles(prev =>
      prev.map(file => {
        if (file.id === fileId) {
          const extension = newName.split('.').pop()?.toLowerCase() || '';
          const languageMap: Record<string, string> = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'css': 'css',
            'html': 'html',
            'json': 'json',
            'md': 'markdown',
          };
          return {
            ...file,
            name: newName,
            language: languageMap[extension] || file.language
          };
        }
        return file;
      })
    );
  };

  const saveVersion = () => {
    createVersion(files);
    toast({
      title: "Version Saved",
      description: "Current state has been saved to version history",
    });
  };

  const restoreVersion = (version: Version) => {
    setFiles(version.files);
    if (version.files.length > 0) {
      setActiveFileId(version.files[0].id);
      if (onCodeChange) {
        onCodeChange(version.files[0].content);
      }
    }
    setShowHistory(false);
    toast({
      title: "Version Restored",
      description: "Files have been restored to selected version",
    });
  };

  const openFileInNewTab = (file: CodeFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const determineLanguage = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
    };
    return languageMap[extension] || 'plaintext';
  };

  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <Card className="w-full h-[600px] overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full border-r">
            <div className="p-4 border-b">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mb-2"
              />
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveVersion}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Version
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4 mr-1" />
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addNewFile}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New File
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-80px)]">
              <div className="p-2">
                {showSettings ? (
                  <SystemPromptEditor />
                ) : showHistory ? (
                  <div className="mb-4 space-y-2">
                    <h3 className="font-semibold px-2">Version History</h3>
                    {versions.map((version, index) => (
                      <div
                        key={version.timestamp}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => restoreVersion(version)}
                      >
                        <div className="flex items-center">
                          <GitBranch className="h-4 w-4 mr-2" />
                          <div>
                            <div className="text-sm font-medium">
                              Version {versions.length - index}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(version.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreVersion(version);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  files.map(file => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                        file.id === activeFileId ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setActiveFileId(file.id)}
                    >
                      <div className="flex items-center">
                        <FileCode className="h-4 w-4 mr-2" />
                        <Input
                          value={file.name}
                          onChange={(e) => renameFile(file.id, e.target.value)}
                          className="h-6 px-1 bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFileInNewTab(file);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          disabled={files.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={80}>
          <div className="h-full flex flex-col">
            {activeFile && (
              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage={determineLanguage(activeFile.name)}
                  language={determineLanguage(activeFile.name)}
                  value={activeFile.content}
                  onChange={(value) => handleFileChange(activeFile.id, value || '')}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: "on",
                    readOnly: readOnly,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    theme: "vs-dark"
                  }}
                />
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Card>
  );
}