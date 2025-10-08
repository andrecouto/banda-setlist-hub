import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, Plus, UserCheck, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'superuser' | 'band_admin' | 'band_member';
  band_id: string | null;
  created_at: string;
}

interface Band {
  id: string;
  name: string;
}

const UserManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Check if user is superuser
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkUserRole();
      fetchProfiles();
      fetchBands();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    setUserRole(data?.role || null);
  };

  const fetchProfiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        name,
        email,
        role,
        band_id,
        created_at,
        bands:band_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar perfis",
        description: error.message,
      });
    } else {
      setProfiles(data || []);
    }
    setIsLoading(false);
  };

  const fetchBands = async () => {
    const { data, error } = await supabase
      .from('bands')
      .select('id, name')
      .order('name');

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar bandas",
        description: error.message,
      });
    } else {
      setBands(data || []);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'superuser' | 'band_admin' | 'band_member';
    const bandId = formData.get('band_id') as string;

    try {
      // Create user using the regular signup method
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Falha ao criar usuário');
      }

      // Wait a bit for the profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the profile with the correct role and band
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role,
          band_id: bandId || null
        })
        .eq('user_id', authData.user.id);

      if (updateError) {
        console.warn('Erro ao atualizar perfil:', updateError);
        // Don't throw here as the user was created successfully
      }

      toast({
        title: "Usuário criado com sucesso!",
        description: `${name} foi adicionado ao sistema. ${authData.user.email_confirmed_at ? '' : 'Um email de confirmação foi enviado.'}`,
      });

      fetchProfiles();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message,
      });
    }

    setIsCreating(false);
  };

  const handleDeleteProfile = async (profileId: string, userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      // Instead of deleting the user from auth (which requires admin), 
      // we'll just delete the profile and let the user account remain
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Perfil excluído com sucesso!",
        description: "O perfil foi removido do sistema, mas a conta de usuário permanece ativa.",
      });

      fetchProfiles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir perfil",
        description: error.message,
      });
    }
  };

  const handleUpdateRole = async (profileId: string, currentRole: string, targetRole: 'superuser' | 'band_admin' | 'band_member') => {
    // Only superusers can change to/from superuser role
    if (userRole !== 'superuser' && (targetRole === 'superuser' || currentRole === 'superuser')) {
      toast({
        variant: "destructive",
        title: "Permissão negada",
        description: "Apenas administradores podem gerenciar o role de superusuário",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: targetRole })
        .eq('id', profileId);

      if (error) throw error;

      const roleNames = {
        superuser: 'Administrador',
        band_admin: 'Administrador de Banda',
        band_member: 'Usuário Comum'
      };

      toast({
        title: "Role atualizado!",
        description: `Usuário agora é ${roleNames[targetRole]}`,
      });

      fetchProfiles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar role",
        description: error.message,
      });
    }
  };

  // Redirect if not superuser
  if (userRole && userRole !== 'superuser') {
    return <Navigate to="/" replace />;
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/5 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Botão Home no canto superior esquerdo */}
        <div className="flex justify-start">
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 hover-lift hover:bg-primary/10"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </Link>
        </div>
        
        <div className="text-center space-y-3 md:space-y-4">
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 rounded-full bg-primary/10">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-gradient">Gerenciamento de Usuários</h1>
          </div>
          <p className="text-sm md:text-lg text-muted-foreground px-4">
            Crie e gerencie usuários do sistema
          </p>
        </div>

        {/* Create User Form */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Novo Usuário
            </CardTitle>
            <CardDescription>
              Preencha os dados para criar um novo usuário. O usuário receberá um email de confirmação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="band_member">Usuário Comum</SelectItem>
                    <SelectItem value="band_admin">Administrador de Banda</SelectItem>
                    <SelectItem value="superuser">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="band_id">Banda (Opcional)</Label>
                <Select name="band_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma banda" />
                  </SelectTrigger>
                  <SelectContent>
                    {bands.map((band) => (
                      <SelectItem key={band.id} value={band.id}>
                        {band.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button type="submit" className="w-full btn-gradient" disabled={isCreating}>
                  {isCreating ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
            <CardDescription>
              Lista de todos os usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-lg font-medium">Carregando usuários...</div>
              </div>
            ) : (
              (() => {
                const totalPages = Math.ceil(profiles.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedProfiles = profiles.slice(startIndex, endIndex);

                return (
                  <>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <Table className="min-w-[900px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">Nome</TableHead>
                            <TableHead className="min-w-[200px]">Email</TableHead>
                            <TableHead className="min-w-[130px]">Perfil</TableHead>
                            <TableHead className="min-w-[120px]">Banda</TableHead>
                            <TableHead className="min-w-[110px]">Criado em</TableHead>
                            <TableHead className="min-w-[220px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {paginatedProfiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">{profile.name}</TableCell>
                            <TableCell>{profile.email}</TableCell>
                            <TableCell>
                              <Badge variant={profile.role === 'superuser' ? 'default' : profile.role === 'band_admin' ? 'outline' : 'secondary'}>
                                {profile.role === 'superuser' ? 'Administrador' : profile.role === 'band_admin' ? 'Admin de Banda' : 'Usuário Comum'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {profile.band_id ? (
                                <span className="text-sm text-muted-foreground">
                                  {(profile as any).bands?.name || 'Banda não encontrada'}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Sem banda</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {profile.email !== 'administrador' && (
                                  <>
                                    <Select
                                      value={profile.role}
                                      onValueChange={(value) => handleUpdateRole(profile.id, profile.role, value as 'superuser' | 'band_admin' | 'band_member')}
                                    >
                                      <SelectTrigger className="h-8 w-[180px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="band_member">Usuário Comum</SelectItem>
                                        <SelectItem value="band_admin">Admin de Banda</SelectItem>
                                        {userRole === 'superuser' && (
                                          <SelectItem value="superuser">Administrador</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteProfile(profile.id, profile.user_id)}
                                      className="text-destructive hover:text-destructive"
                                      title="Excluir perfil"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;