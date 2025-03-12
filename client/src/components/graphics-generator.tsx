import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GraphicsGeneratorProps {
  gameDesign: any;
  onGraphicsGenerated: (graphics: any[]) => void;
}

export function GraphicsGenerator({ gameDesign, onGraphicsGenerated }: GraphicsGeneratorProps) {
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const { toast } = useToast();

  const generateGraphicsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/design/analyze-graphics', {
        gameDesign
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedImages(data.generatedImages);
      onGraphicsGenerated(data.generatedImages);
      toast({
        title: "Graphics Generated",
        description: `Generated ${data.generatedImages.length} images for your game.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate graphics",
        variant: "destructive",
      });
    }
  });

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Game Graphics</h2>
            <Button
              onClick={() => generateGraphicsMutation.mutate()}
              disabled={generateGraphicsMutation.isPending}
            >
              {generateGraphicsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Graphics...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Generate Graphics
                </>
              )}
            </Button>
          </div>

          {generatedImages.length > 0 && (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="space-y-2">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="rounded-lg w-full h-auto"
                    />
                    <div className="text-sm font-medium">{image.name}</div>
                    <div className="text-sm text-muted-foreground">{image.purpose}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
