import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sistema de Bandas</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {user.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Bem-vindo ao Sistema de Bandas</h2>
          <p className="text-xl text-muted-foreground">
            Gerencie eventos, músicas e integrantes da sua banda
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">Eventos</h3>
            <p className="text-muted-foreground mb-4">
              Registre e gerencie os eventos da sua banda
            </p>
            <Button className="w-full">Ver Eventos</Button>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">Músicas</h3>
            <p className="text-muted-foreground mb-4">
              Organize o repertório e tons das músicas
            </p>
            <Button className="w-full">Ver Músicas</Button>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-xl font-semibold mb-2">Bandas</h3>
            <p className="text-muted-foreground mb-4">
              Gerencie informações das bandas e membros
            </p>
            <Button className="w-full">Ver Bandas</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
