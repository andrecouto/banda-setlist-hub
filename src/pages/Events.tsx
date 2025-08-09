import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { EventCard } from "@/components/EventCard";
import { Plus, Calendar, Users, Music, Search, Filter } from "lucide-react";

interface Event {
  id: string;
  name: string;
  event_date: string;
  notes: string | null;
  youtube_link: string | null;
  band_id: string;
  leader_id: string | null;
  bands: { name: string };
  profiles: { name: string } | null;
}

interface Band {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  name: string;
}

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBand, setSelectedBand] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formData, setFormData] = useState({
    name: "",
    event_date: "",
    notes: "",
    youtube_link: "",
    band_id: "",
    leader_id: "",
  });

  useEffect(() => {
    fetchEvents();
    fetchBands();
    fetchProfiles();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          bands(name),
          profiles(name)
        `)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar eventos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBands = async () => {
    try {
      const { data, error } = await supabase
        .from("bands")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setBands(data || []);
    } catch (error) {
      console.error("Error fetching bands:", error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.event_date || !formData.band_id) return;

    try {
      const eventData = {
        name: formData.name,
        event_date: formData.event_date,
        notes: formData.notes || null,
        youtube_link: formData.youtube_link || null,
        band_id: formData.band_id,
        leader_id: formData.leader_id || null,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Evento atualizado!" });
      } else {
        const { error } = await supabase
          .from("events")
          .insert(eventData);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Evento criado!" });
      }

      setFormData({
        name: "",
        event_date: "",
        notes: "",
        youtube_link: "",
        band_id: "",
        leader_id: "",
      });
      setEditingEvent(null);
      setIsDialogOpen(false);
      fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar evento",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      event_date: event.event_date,
      notes: event.notes || "",
      youtube_link: event.youtube_link || "",
      band_id: event.band_id,
      leader_id: event.leader_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Evento excluído!" });
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir evento",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    setFormData({
      name: "",
      event_date: "",
      notes: "",
      youtube_link: "",
      band_id: "",
      leader_id: "",
    });
    setIsDialogOpen(true);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.bands.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBand = selectedBand === "" || event.band_id === selectedBand;
    return matchesSearch && matchesBand;
  });

  const upcomingEvents = filteredEvents.filter(event => new Date(event.event_date) > new Date());
  const pastEvents = filteredEvents.filter(event => new Date(event.event_date) <= new Date());

  const getEventStats = () => {
    return {
      total: events.length,
      upcoming: events.filter(event => new Date(event.event_date) > new Date()).length,
      thisMonth: events.filter(event => {
        const eventDate = new Date(event.event_date);
        const now = new Date();
        return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
      }).length,
    };
  };

  const stats = getEventStats();

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
            <p className="text-muted-foreground">Gerencie seus eventos e apresentações</p>
            <div className="flex gap-4 mt-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {stats.total} eventos
              </Badge>
              <Badge variant="default" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {stats.upcoming} próximos
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                {stats.thisMonth} este mês
              </Badge>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Editar Evento" : "Novo Evento"}
                </DialogTitle>
                <DialogDescription>
                  {editingEvent
                    ? "Atualize as informações do evento"
                    : "Crie um novo evento"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Nome do evento"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="event_date">Data</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, event_date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="band_id">Banda</Label>
                  <Select
                    value={formData.band_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, band_id: value }))
                    }
                    required
                  >
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
                <div>
                  <Label htmlFor="leader_id">Líder</Label>
                  <Select
                    value={formData.leader_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, leader_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um líder" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="youtube_link">Link do YouTube</Label>
                  <Input
                    id="youtube_link"
                    value={formData.youtube_link}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, youtube_link: e.target.value }))
                    }
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Observações sobre o evento"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingEvent ? "Atualizar" : "Criar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {/* Filtros e Busca */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar e Filtrar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar eventos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedBand} onValueChange={setSelectedBand}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por banda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as bandas</SelectItem>
                    {bands.map((band) => (
                      <SelectItem key={band.id} value={band.id}>
                        {band.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Tabs value="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Próximos Eventos ({upcomingEvents.length})</TabsTrigger>
              <TabsTrigger value="past">Eventos Passados ({pastEvents.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum evento próximo encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past" className="space-y-4">
              {pastEvents.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum evento passado encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}