import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { GameSandbox } from "@/components/game-sandbox";

// Default game code in case nothing is saved
const DEFAULT_GAME_CODE = `
// Simple interactive bouncing ball game with multiple balls
// Colors
const COLORS = ["#4CAF50", "#2196F3", "#FFC107", "#F44336", "#9C27B0"];

// Ball class
class Ball {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.dx = (Math.random() * 6) - 3;
    this.dy = (Math.random() * 6) - 3;
    
    // Ensure we have some movement
    if (Math.abs(this.dx) < 0.5) this.dx = 1;
    if (Math.abs(this.dy) < 0.5) this.dy = 1;
  }
  
  update() {
    // Bounce off walls
    if (this.x + this.dx > canvas.width - this.radius || this.x + this.dx < this.radius) {
      this.dx = -this.dx;
    }
    if (this.y + this.dy > canvas.height - this.radius || this.y + this.dy < this.radius) {
      this.dy = -this.dy;
    }
    
    // Move ball
    this.x += this.dx;
    this.y += this.dy;
  }
  
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // Add a light shimmer effect
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();
  }
}

// Create balls
const balls = [];
for (let i = 0; i < 10; i++) {
  const radius = Math.random() * 20 + 10;
  const x = Math.random() * (canvas.width - radius * 2) + radius;
  const y = Math.random() * (canvas.height - radius * 2) + radius;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  balls.push(new Ball(x, y, radius, color));
}

// Add a player-controlled ball with mouse
const playerBall = new Ball(canvas.width / 2, canvas.height / 2, 30, "#FF5722");
let isMouseDown = false;

// Add mouse event listeners
canvas.addEventListener("mousedown", function(e) {
  isMouseDown = true;
});

canvas.addEventListener("mouseup", function() {
  isMouseDown = false;
});

canvas.addEventListener("mousemove", function(e) {
  if (isMouseDown) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Only update if within bounds
    if (mouseX > playerBall.radius && mouseX < canvas.width - playerBall.radius &&
        mouseY > playerBall.radius && mouseY < canvas.height - playerBall.radius) {
      playerBall.x = mouseX;
      playerBall.y = mouseY;
    }
  }
});

// Add touch support for mobile
canvas.addEventListener("touchstart", function(e) {
  isMouseDown = true;
  e.preventDefault();
});

canvas.addEventListener("touchend", function() {
  isMouseDown = false;
});

canvas.addEventListener("touchmove", function(e) {
  if (isMouseDown && e.touches[0]) {
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;
    
    if (touchX > playerBall.radius && touchX < canvas.width - playerBall.radius &&
        touchY > playerBall.radius && touchY < canvas.height - playerBall.radius) {
      playerBall.x = touchX;
      playerBall.y = touchY;
    }
    e.preventDefault();
  }
});

// Game animation loop
function animate() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(1, "#16213e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Update and draw all balls
  for (const ball of balls) {
    ball.update();
    ball.draw();
    
    // Check collision with player ball
    const dx = ball.x - playerBall.x;
    const dy = ball.y - playerBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < ball.radius + playerBall.radius) {
      // Simple bounce effect
      ball.dx = -ball.dx * 1.1;
      ball.dy = -ball.dy * 1.1;
      
      // Limit max speed
      ball.dx = Math.min(Math.max(ball.dx, -8), 8);
      ball.dy = Math.min(Math.max(ball.dy, -8), 8);
    }
  }
  
  // Draw player ball
  playerBall.draw();
  
  // Draw instruction text
  ctx.font = "16px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("Click and drag to move the orange ball", canvas.width / 2, 30);
  
  // Continue animation
  requestAnimationFrame(animate);
}

// Start game
animate();
console.log("Game initialized with", balls.length, "balls");
`;

export default function RunPage() {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    // First check sessionStorage (most recent), then localStorage as fallback
    const sessionCode = sessionStorage.getItem('currentGameCode');
    const localCode = localStorage.getItem('gameCode');
    
    if (sessionCode) {
      setGameCode(sessionCode);
    } else if (localCode) {
      setGameCode(localCode);
    } else {
      // Use default game code if none is available
      setGameCode(DEFAULT_GAME_CODE);
    }
  }, []);

  const handleRunGame = () => {
    if (!gameCode) return;
    setIsLaunching(true);
    
    // Add a small delay to show the loading animation
    setTimeout(() => {
      setShowGame(true);
      setFullscreen(true);
    }, 800); // Delay for visual effect
  };

  const handleCloseGame = () => {
    setShowGame(false);
    setIsLaunching(false);
    setFullscreen(false);
  };

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-background' : 'container py-8'} transition-all duration-300`}>
      {/* Only show back button when not in fullscreen mode */}
      {!fullscreen && (
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="outline" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Design
            </Button>
          </Link>
        </div>
      )}
      
      {/* Loading animation during transition */}
      {isLaunching && !showGame && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-secondary rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-medium mb-2">Preparing Game Environment</h3>
          <p className="text-muted-foreground">Loading assets and initializing game...</p>
        </div>
      )}
      
      {/* Game sandbox */}
      {showGame ? (
        <GameSandbox 
          gameCode={gameCode}
          onClose={handleCloseGame}
          showCode={false}
          fullscreen={fullscreen}
        />
      ) : (
        !isLaunching && (
          <Card>
            <CardHeader>
              <CardTitle>Run Game</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Button 
                  onClick={handleRunGame}
                  size="lg"
                  className="w-full max-w-sm relative"
                  disabled={isLaunching}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Launch Game
                </Button>
                {!gameCode && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    A default demo game will be loaded
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}