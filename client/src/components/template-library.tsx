import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import type { GameTemplate } from "@shared/schema";

interface TemplateLibraryProps {
  onTemplateSelect: (code: string) => void;
}

export function TemplateLibrary({ onTemplateSelect }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<GameTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = templates ? Array.from(new Set(templates.map(t => t.category))) : [];

  const handleTemplateSelect = (template: GameTemplate) => {
    onTemplateSelect(template.code);
    toast({
      title: "Template Selected",
      description: `Loading ${template.name} template...`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="grid grid-cols-2 gap-4">
          {filteredTemplates?.map(template => (
            <Card key={template.id} className="p-4 hover:bg-accent cursor-pointer" onClick={() => handleTemplateSelect(template)}>
              {template.previewImageUrl && (
                <img
                  src={template.previewImageUrl}
                  alt={template.name}
                  className="w-full h-32 object-cover rounded-md mb-3"
                />
              )}
              <h3 className="font-semibold mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                {template.tags?.map(tag => (
                  <span key={tag} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
