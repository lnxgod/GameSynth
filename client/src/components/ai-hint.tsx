import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Sparkles, Wand2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIHintProps {
  context?: string;
  gameDesign?: any;
  code?: string;
  currentFeature?: string;
}

export function AIHint({ context, gameDesign, code, currentFeature }: AIHintProps) {
  const [hint, setHint] = useState<string>("");
  const [showHint, setShowHint] = useState(false);
  const { toast } = useToast();

  const hintMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hint", {
        context,
        gameDesign,
        code,
        currentFeature
      });
      return res.json();
    },
    onSuccess: (data) => {
      setHint(data.hint);
      setShowHint(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const icons = [
    <Lightbulb className="w-5 h-5" />,
    <Sparkles className="w-5 h-5" />,
    <Wand2 className="w-5 h-5" />
  ];

  const [currentIcon, setCurrentIcon] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => hintMutation.mutate()}
        disabled={hintMutation.isPending}
      >
        <motion.div
          key={currentIcon}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          {hintMutation.isPending ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              {icons[currentIcon]}
            </motion.div>
          ) : (
            icons[currentIcon]
          )}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-full mt-2 p-4 bg-card rounded-lg shadow-lg w-64 z-50"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm"
            >
              {hint}
            </motion.div>
            <button
              onClick={() => setShowHint(false)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
