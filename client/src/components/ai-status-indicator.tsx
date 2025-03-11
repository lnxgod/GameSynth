import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AIStatusIndicatorProps {
  operation?: string;
  visible: boolean;
}

export function AIStatusIndicator({ operation, visible }: AIStatusIndicatorProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
    } else {
      // Add a small delay before hiding to ensure smooth transitions
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full 
        shadow-lg border border-primary/20 transition-all duration-500 flex items-center gap-2
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent font-medium">
        {operation || 'AI Working...'}
      </span>
    </div>
  );
}
