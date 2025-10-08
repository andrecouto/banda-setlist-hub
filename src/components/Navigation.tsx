import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Music, Calendar, Users, LogOut, User, Home } from "lucide-react";

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
    <nav className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-3 md:p-4 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Botão Home */}
          <Link to="/">
            <Button
              variant={location.pathname === "/" ? "default" : "outline"}
              size="sm"
              className={`flex items-center gap-1 md:gap-2 hover-lift ${
                location.pathname === "/"
                  ? "btn-gradient shadow-glow"
                  : "hover:bg-primary/10"
              }`}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </Link>
          
          <h1 className="text-sm md:text-xl font-bold text-gradient font-poppins hidden sm:block truncate">Band Manager</h1>
          
          {/* Menu de navegação - scroll horizontal em mobile */}
          <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide flex-1">
            {navItems.filter(item => item.path !== "/").map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path} className="shrink-0">
                <Button
                  variant={location.pathname === path ? "default" : "ghost"}
                  size="sm"
                  className={`flex items-center gap-1 md:gap-2 hover-lift ${
                    location.pathname === path 
                      ? "btn-gradient shadow-glow" 
                      : "hover:bg-primary/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline text-xs md:text-sm">{label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          <span className="text-xs md:text-sm text-muted-foreground hidden lg:inline truncate max-w-[150px]">
            {user?.email}
          </span>
          <ThemeToggle />
          <Link to="/profile">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 md:gap-2 hover-lift"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">Perfil</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center gap-1 md:gap-2 hover-lift text-destructive hover:text-destructive-foreground hover:bg-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-xs md:text-sm">Sair</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}