import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Play, Settings, ImageIcon, Palette } from "lucide-react";
import { GameIdeaGenerator } from "@/components/game-idea-generator";

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
          <Link href="/prompts-setup">
            <Button variant="ghost">
              <Settings className="mr-2 h-4 w-4" />
              Prompts Setup
            </Button>
          </Link>
          <Link href="/assets">
            <Button variant="ghost">
              <ImageIcon className="mr-2 h-4 w-4" />
              Assets
            </Button>
          </Link>
          <Link href="/asset-mapping-test">
            <Button variant="ghost">
              <Palette className="mr-2 h-4 w-4" />
              Asset Mapping
            </Button>
          </Link>
          <GameIdeaGenerator />
          <Link href="/run">
            <Button variant="default">
              <Play className="mr-2 h-4 w-4" />
              Run Game
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}