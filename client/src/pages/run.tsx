import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameCanvas } from "@/components/game-canvas";
import { useAuth } from "@/lib/auth";

export default function RunPage() {
  const { auth } = useAuth();

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Run Game</CardTitle>
        </CardHeader>
        <CardContent>
          <GameCanvas />
        </CardContent>
      </Card>
    </div>
  );
}
