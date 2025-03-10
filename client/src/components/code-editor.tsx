import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Download, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function CodeEditor({ code, onCodeChange }: CodeEditorProps) {
  const [localCode, setLocalCode] = useState(code);
  const [savedGames, setSavedGames] = useState<{ name: string; code: string }[]>([]);
  const [saveName, setSaveName] = useState("");
  const { toast } = useToast();

  // Load saved games from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("savedGames");
    if (saved) {
      setSavedGames(JSON.parse(saved));
    }
  }, []);

  // Update local code when prop changes
  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalCode(e.target.value);
    onCodeChange(e.target.value);
  };

  const handleSave = () => {
    if (!saveName) {
      toast({
        title: "Error",
        description: "Please enter a name for your game",
        variant: "destructive",
      });
      return;
    }

    const newSavedGames = [...savedGames, { name: saveName, code: localCode }];
    setSavedGames(newSavedGames);
    localStorage.setItem("savedGames", JSON.stringify(newSavedGames));
    
    toast({
      title: "Success",
      description: `Game "${saveName}" saved successfully`,
    });
    setSaveName("");
  };

  const handleLoad = (savedCode: string) => {
    setLocalCode(savedCode);
    onCodeChange(savedCode);
    toast({
      title: "Success",
      description: "Game code loaded successfully",
    });
  };

  const handleReset = () => {
    setLocalCode("");
    onCodeChange("");
    toast({
      title: "Reset",
      description: "Code editor has been reset",
    });
  };

  const handleClearSaved = () => {
    localStorage.removeItem("savedGames");
    setSavedGames([]);
    toast({
      title: "Cleared",
      description: "All saved games have been removed",
    });
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Enter game name to save"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSave} className="whitespace-nowrap">
            <Save className="mr-2 h-4 w-4" />
            Save Game
          </Button>
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleClearSaved} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Saved
          </Button>
        </div>

        {savedGames.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {savedGames.map((game, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => handleLoad(game.code)}
                className="whitespace-nowrap"
              >
                <Download className="mr-2 h-4 w-4" />
                Load "{game.name}"
              </Button>
            ))}
          </div>
        )}

        <textarea
          value={localCode}
          onChange={handleCodeChange}
          className="w-full h-[600px] font-mono text-sm p-4 bg-background border rounded-md"
          spellCheck="false"
        />
      </div>
    </Card>
  );
}
