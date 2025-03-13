import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  FolderTree,
  FileCode,
  Save,
  Plus,
  X,
  ExternalLink,
  FolderOpen,
  Loader2
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Editor from "@monaco-editor/react";

interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface Project {
  id: number;
  name: string;
  files: CodeFile[];
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
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [showProjectList, setShowProjectList] = useState(false);
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
    }
  }, [initialCode]);

  const saveProjectMutation = useMutation({
    mutationFn: async (project: { name: string; files: CodeFile[] }) => {
      const res = await apiRequest('POST', '/api/projects', project);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Project saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      window.history.pushState({}, '', `/editor/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save project",
        variant: "destructive"
      });
    }
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!auth.isAuthenticated) {
        return [];
      }
      const res = await apiRequest('GET', '/api/projects');
      return res.json();
    },
    enabled: auth.isAuthenticated,
  });

  const loadProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest('GET', `/api/projects/${projectId}`);
      const data = await res.json();
      return data;
    },
    onSuccess: (project: Project) => {
      setFiles(project.files);
      setProjectName(project.name);
      if (project.files.length > 0) {
        setActiveFileId(project.files[0].id);
        if (onCodeChange) {
          onCodeChange(project.files[0].content);
        }
      }
      toast({
        title: "Success",
        description: "Project loaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to load project",
        variant: "destructive"
      });
    }
  });

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

  const saveProject = () => {
    if (!auth.isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save projects",
        variant: "destructive"
      });
      return;
    }

    saveProjectMutation.mutate({
      name: projectName,
      files
    });
  };

  const loadProject = (projectId: number) => {
    loadProjectMutation.mutate(projectId);
    setShowProjectList(false);
  };

  const openFileInNewTab = (file: CodeFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const activeFile = files.find(f => f.id === activeFileId);

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
                  onClick={saveProject}
                  disabled={saveProjectMutation.isPending || !auth.isAuthenticated}
                >
                  {saveProjectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProjectList(!showProjectList)}
                  disabled={!auth.isAuthenticated}
                >
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Load
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
                {showProjectList && (
                  <div className="mb-4 space-y-2">
                    <h3 className="font-semibold px-2">Available Projects</h3>
                    {isLoadingProjects ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading projects...
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="text-sm text-muted-foreground px-2">
                        No projects found
                      </div>
                    ) : (
                      projects.map((project: Project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => loadProject(project.id)}
                        >
                          <div className="flex items-center">
                            <FolderTree className="h-4 w-4 mr-2" />
                            <span>{project.name}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {files.map(file => (
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
                ))}
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