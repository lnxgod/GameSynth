import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Check, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameDebuggerProps {
  code: string;
  onFixedCode: (fixedCode: string) => void;
}

type DebugIssue = {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  autoFixable: boolean;
};

export function GameDebugger({ code, onFixedCode }: GameDebuggerProps) {
  const [issues, setIssues] = useState<DebugIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixInProgress, setFixInProgress] = useState<string | null>(null);
  const { toast } = useToast();

  const analyzeCode = async () => {
    if (!code) {
      toast({
        title: "Error",
        description: "No code available to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setIssues([]);

    try {
      const response = await fetch('/api/code/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      // Safely handle various potential response formats
      const issuesArray = Array.isArray(data.issues) 
        ? data.issues 
        : (data.issues && data.issues.issues && Array.isArray(data.issues.issues)) 
          ? data.issues.issues 
          : [];
          
      setIssues(issuesArray);

      if (issuesArray.length > 0) {
        toast({
          title: "Analysis Complete",
          description: `Found ${issuesArray.length} potential issue${issuesArray.length === 1 ? '' : 's'}`,
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "No issues found in your game code",
        });
      }
    } catch (error) {
      console.error('Error analyzing code:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze code",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fixIssue = async (issue: DebugIssue) => {
    if (!issue.autoFixable) {
      toast({
        title: "Cannot Auto-Fix",
        description: "This issue requires manual intervention",
        variant: "destructive",
      });
      return;
    }

    setFixInProgress(issue.id);
    setIsFixing(true);

    try {
      const response = await fetch('/api/code/fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          issueId: issue.id,
          issueMessage: issue.message 
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.fixedCode) {
        onFixedCode(data.fixedCode);
        
        // Update issues list to mark this issue as fixed
        setIssues(prev => 
          prev.filter(i => i.id !== issue.id)
        );
        
        toast({
          title: "Issue Fixed",
          description: "The code has been updated to fix the issue",
        });
      } else {
        throw new Error("No fixed code returned from server");
      }
    } catch (error) {
      console.error('Error fixing issue:', error);
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : "Failed to fix the issue",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
      setFixInProgress(null);
    }
  };

  const fixAllIssues = async () => {
    if (!issues.length || !issues.some(issue => issue.autoFixable)) {
      toast({
        title: "No Fixable Issues",
        description: "There are no auto-fixable issues to fix",
        variant: "destructive",
      });
      return;
    }

    setIsFixing(true);

    try {
      const response = await fetch('/api/code/fix-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.fixedCode) {
        onFixedCode(data.fixedCode);
        
        // Update or reanalyze issues
        const fixedCount = issues.filter(i => i.autoFixable).length;
        setIssues(prev => 
          prev.filter(i => !i.autoFixable)
        );
        
        toast({
          title: "Issues Fixed",
          description: `Fixed ${fixedCount} issue${fixedCount === 1 ? '' : 's'}`,
        });
      } else {
        throw new Error("No fixed code returned from server");
      }
    } catch (error) {
      console.error('Error fixing all issues:', error);
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : "Failed to fix issues",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getIssueTypeColor = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Game Debugger</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={analyzeCode}
            disabled={isAnalyzing || isFixing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Code'
            )}
          </Button>
          
          {issues.some(issue => issue.autoFixable) && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={fixAllIssues}
              disabled={isAnalyzing || isFixing}
            >
              {isFixing && !fixInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing All...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Fix All Issues
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {issues.length > 0 ? (
        <ScrollArea className="h-[200px] border rounded-md p-4">
          <div className="space-y-3">
            {issues.map(issue => (
              <Card key={issue.id} className="p-3 relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle 
                      className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        issue.type === 'error' ? 'text-destructive' : 
                        issue.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                      }`} 
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getIssueTypeColor(issue.type) as any}>
                          {issue.type.toUpperCase()}
                        </Badge>
                        {issue.line && (
                          <span className="text-xs text-muted-foreground">
                            Line {issue.line}{issue.column ? `, Col ${issue.column}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-1">{issue.message}</p>
                    </div>
                  </div>
                  
                  {issue.autoFixable && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="ml-2 flex-shrink-0"
                      onClick={() => fixIssue(issue)}
                      disabled={isAnalyzing || isFixing}
                    >
                      {isFixing && fixInProgress === issue.id ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Fixing...
                        </>
                      ) : (
                        <>
                          <Wrench className="mr-1 h-3 w-3" />
                          Fix Issue
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : isAnalyzing ? (
        <div className="flex justify-center items-center h-[150px] border rounded-md bg-muted/20">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-muted-foreground">Analyzing your game code...</p>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-[150px] border rounded-md bg-muted/20">
          <div className="flex flex-col items-center text-center px-4">
            <AlertTriangle className="h-8 w-8 mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {code ? "Click 'Analyze Code' to detect issues in your game" : "No game code available for analysis"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}