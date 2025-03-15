import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export function NavBar() {
  return (
    <nav className="border-b bg-background">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold">Game Dev Platform</span>
          </Link>
        </div>
        <div className="flex-1" />
        <div className="flex items-center space-x-4">
          <Link href="/run">
            <Button variant="ghost">
              <Play className="mr-2 h-4 w-4" />
              Run Game
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}