import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ArrowLeft, Users, Calendar, Music, UserPlus, UserMinus } from "lucide-react";

interface BandDetails {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'superuser' | 'band_admin' | 'band_member';
  joined_at: string;
  user_id: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  user_id: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  notes: string | null;
}

export default function BandDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [band, setBand] = useState<BandDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchBandDetails();
      fetchUserRole();
    }
  }, [id, user]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setUserRole(data.role);
    }
  };

  const fetchAvailableUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, user_id, band_id")
      .is("band_id", null);

    if (!error && data) {
      setAvailableUsers(data);
    }
  };

  const fetchBandDetails = async () => {
    try {
      // Fetch band details
      const { data: bandData, error: bandError } = await supabase
        .from("bands")
        .select("*")
        .eq("id", id)
        .single();

      if (bandError) throw bandError;
      setBand(bandData);

      // Fetch band members
      const { data: membersData, error: membersError } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at, user_id")
        .eq("band_id", id);

      if (membersError) throw membersError;
      setMembers(membersData.map(member => ({
        ...member,
        joined_at: member.created_at
      })));

      // Fetch band events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, name, event_date, notes")
        .eq("band_id", id)
        .order("event_date", { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData);

    } catch (error) {
      console.error("Error fetching band details:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes da banda",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !id) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ band_id: id })
        .eq("id", selectedUserId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Membro adicionado à banda",
      });

      setAddMemberOpen(false);
      setSelectedUserId("");
      fetchBandDetails();
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar membro",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ band_id: null })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Membro removido da banda",
      });

      fetchBandDetails();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover membro",
        variant: "destructive",
      });
    }
  };

  const isAdmin = userRole === "superuser" || userRole === "band_admin";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center">Banda não encontrada</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/bands">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{band.name}</h1>
            <p className="text-muted-foreground">{band.description || "Sem descrição"}</p>
          </div>
        </div>

        <div className="grid gap-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Membros</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">membros ativos</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eventos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{events.length}</div>
                <p className="text-xs text-muted-foreground">eventos registrados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Criada em</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(band.created_at).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">data de criação</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Membros da Banda</CardTitle>
                    <CardDescription>
                      {members.length} membro(s) na banda
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="flex items-center gap-2"
                          onClick={fetchAvailableUsers}
                        >
                          <UserPlus className="h-4 w-4" />
                          Adicionar Membro
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Membro à Banda</DialogTitle>
                          <DialogDescription>
                            Selecione um usuário para adicionar à banda
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um usuário" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setAddMemberOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleAddMember}
                            disabled={!selectedUserId}
                          >
                            Adicionar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum membro na banda
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Desde</TableHead>
                          {isAdmin && <TableHead>Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'superuser' ? 'default' : member.role === 'band_admin' ? 'secondary' : 'outline'}>
                                {member.role === 'superuser' ? 'Superuser' : member.role === 'band_admin' ? 'Admin' : 'Membro'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(member.joined_at).toLocaleDateString()}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                {member.role !== 'superuser' && member.user_id !== user?.id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Remover
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Eventos da Banda</CardTitle>
                    <CardDescription>
                      {events.length} evento(s) registrado(s)
                    </CardDescription>
                  </div>
                  <Link to="/events">
                    <Button>Novo Evento</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum evento registrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.name}</TableCell>
                          <TableCell>
                            {new Date(event.event_date + 'T00:00:00').toLocaleDateString()}
                          </TableCell>
                          <TableCell>{event.notes || "-"}</TableCell>
                          <TableCell>
                            <Link to={`/events/${event.id}`}>
                              <Button variant="outline" size="sm">
                                Ver Detalhes
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}