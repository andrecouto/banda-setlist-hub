import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Music, Calendar, Users, LogOut, User } from "lucide-react";

export function Navigation() {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { path: "/", label: "Início", icon: Music },
    { path: "/bands", label: "Bandas", icon: Users },
    { path: "/events", label: "Eventos", icon: Calendar },
    { path: "/songs", label: "Músicas", icon: Music },
  ];

  return (
    <nav className="bg-card border-b border-border p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-foreground">Band Manager</h1>
          <div className="flex space-x-4">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}>
                <Button
                  variant={location.pathname === path ? "default" : "ghost"}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Link to="/profile">
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Perfil
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </nav>
  );
}