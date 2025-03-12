import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCircle, Settings, LogOut } from "lucide-react";

export function NavBar() {
  const { auth, logout } = useAuth();

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
          {auth.isAuthenticated && (
            <>
              {auth.role === 'admin' && (
                <Link href="/users">
                  <Button variant="ghost">
                    <Settings className="mr-2 h-4 w-4" />
                    User Management
                  </Button>
                </Link>
              )}
              <div className="flex items-center space-x-2">
                <UserCircle className="h-5 w-5" />
                <span>{auth.username}</span>
              </div>
              <Button variant="ghost" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
