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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { EventCard } from "@/components/EventCard";
import { EventSongManager } from "@/components/EventSongManager";
import { Plus, Calendar, Users, Music, Search, Filter, X } from "lucide-react";

type EventType = 'culto_domingo' | 'culto_quarta' | 'especial';

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_type: EventType;
  notes: string | null;
  youtube_link: string | null;
  lyrics: string | null;
  band_id: string;
  leader_id: string | null;
  bands: { name: string };
  profiles: { name: string } | null;
  songs?: { name: string; key_played: string | null }[];
}

interface Band {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  name: string;
}

interface Song {
  id: string;
  name: string;
}

interface EventSong {
  id?: string;
  song_id: string;
  song_order: number;
  key_played: string | null;
  is_medley?: boolean;
  medley_group?: number | null;
  song: {
    id: string;
    name: string;
    key: string | null;
  };
}

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBand, setSelectedBand] = useState("all");
  const [selectedSong, setSelectedSong] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [userRole, setUserRole] = useState<string>('band_member');
  const [eventSongs, setEventSongs] = useState<EventSong[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [formData, setFormData] = useState({
    name: "",
    event_date: "",
    event_type: "culto_domingo" as EventType,
    notes: "",
    youtube_link: "",
    lyrics: "",
    band_id: "",
    leader_id: "none",
  });

  useEffect(() => {
    fetchEvents();
    fetchBands();
    fetchProfiles();
    fetchSongs();
    fetchUserRole();
  }, []);

  const [userBandId, setUserBandId] = useState<string | null>(null);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, band_id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role);
      setUserBandId(data.band_id);
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          name,
          event_date,
          event_type,
          notes,
          youtube_link,
          lyrics,
          band_id,
          leader_id,
          bands(name),
          profiles(name),
          event_songs(
            song_order,
            key_played,
            songs(name)
          )
        `)
        .order("event_date", { ascending: false });

      if (error) throw error;
      
      // Transform the data to include songs in a more convenient format
      const eventsWithSongs = (data || []).map(event => ({
        ...event,
        songs: event.event_songs
          ?.sort((a, b) => a.song_order - b.song_order)
          .map(es => ({
            name: es.songs.name,
            key_played: es.key_played
          })) || []
      }));
      
      setEvents(eventsWithSongs);
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

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSongs(data || []);
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const getEventName = (eventType: EventType, customName: string) => {
    switch (eventType) {
      case 'culto_domingo':
        return 'Culto Domingo';
      case 'culto_quarta':
        return 'Culto Quarta';
      case 'especial':
        return customName.trim() || 'Culto Especial';
      default:
        return 'Evento';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_date || !formData.band_id) return;

    try {
      // Convert local date to UTC to avoid timezone issues
      const localDate = new Date(formData.event_date + 'T00:00:00');
      const utcDate = localDate.toISOString().split('T')[0];

      const eventData = {
        name: getEventName(formData.event_type, formData.name),
        event_date: utcDate,
        event_type: formData.event_type,
        notes: formData.notes || null,
        youtube_link: formData.youtube_link || null,
        lyrics: formData.lyrics || null,
        band_id: formData.band_id,
        leader_id: formData.leader_id === "none" ? null : formData.leader_id,
      };

      let eventId = editingEvent?.id;

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        
        // Delete existing event songs
        await supabase
          .from("event_songs")
          .delete()
          .eq("event_id", editingEvent.id);
        
        toast({ title: "Sucesso", description: "Evento atualizado!" });
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert(eventData)
          .select()
          .single();

        if (error) throw error;
        eventId = data.id;
        toast({ title: "Sucesso", description: "Evento criado!" });
      }

      // Save event songs
      if (eventSongs.length > 0 && eventId) {
        const eventSongsData = eventSongs.map(song => ({
          event_id: eventId,
          song_id: song.song_id,
          song_order: song.song_order,
          key_played: song.key_played,
          is_medley: song.is_medley || false,
          medley_group: song.medley_group || null,
        }));

        const { error: songsError } = await supabase
          .from("event_songs")
          .insert(eventSongsData);

        if (songsError) throw songsError;
      }

      setFormData({
        name: "",
        event_date: "",
        event_type: "culto_domingo",
        notes: "",
        youtube_link: "",
        lyrics: "",
        band_id: "",
        leader_id: "none",
      });
      setEventSongs([]);
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

  const fetchEventSongs = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("event_songs")
        .select(`
          *,
          songs(id, name, key)
        `)
        .eq("event_id", eventId)
        .order("song_order");

      if (error) throw error;
      
      const mappedSongs = (data || []).map(item => ({
        id: item.id,
        song_id: item.song_id,
        song_order: item.song_order,
        key_played: item.key_played,
        is_medley: item.is_medley || false,
        medley_group: item.medley_group || null,
        song: item.songs as any
      }));
      
      setEventSongs(mappedSongs);
    } catch (error) {
      console.error("Error fetching event songs:", error);
    }
  };

  const handleEdit = async (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.event_type === 'especial' ? event.name : "",
      event_date: event.event_date,
      event_type: event.event_type || "culto_domingo",
      notes: event.notes || "",
      youtube_link: event.youtube_link || "",
      lyrics: event.lyrics || "",
      band_id: event.band_id,
      leader_id: event.leader_id || "none",
    });
    await fetchEventSongs(event.id);
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
      event_type: "culto_domingo",
      notes: "",
      youtube_link: "",
      lyrics: "",
      band_id: userBandId || "",
      leader_id: "none",
    });
    setEventSongs([]);
    setIsDialogOpen(true);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.bands.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBand = selectedBand === "all" || selectedBand === "" || event.band_id === selectedBand;
    
    // Date filters
    const eventDate = new Date(event.event_date + 'T00:00:00');
    const matchesStartDate = !startDate || eventDate >= new Date(startDate + 'T00:00:00');
    const matchesEndDate = !endDate || eventDate <= new Date(endDate + 'T00:00:00');
    
    return matchesSearch && matchesBand && matchesStartDate && matchesEndDate;
  });

  // Filter by song if selected
  const [songEventIds, setSongEventIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const filterEventsBySong = async () => {
      if (!selectedSong || selectedSong === "all") {
        setSongEventIds(new Set());
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("event_songs")
          .select("event_id")
          .eq("song_id", selectedSong);
          
        if (error) throw error;
        
        setSongEventIds(new Set(data.map(item => item.event_id)));
      } catch (error) {
        console.error("Error filtering events by song:", error);
        setSongEventIds(new Set());
      }
    };
    
    filterEventsBySong();
  }, [selectedSong]);

  const eventsWithSongs = selectedSong && selectedSong !== "all"
    ? filteredEvents.filter(event => songEventIds.has(event.id))
    : filteredEvents;

  const upcomingEvents = eventsWithSongs.filter(event => new Date(event.event_date + 'T00:00:00') > new Date());
  const pastEvents = eventsWithSongs.filter(event => new Date(event.event_date + 'T00:00:00') <= new Date());

  const getEventStats = () => {
    return {
      total: events.length,
      upcoming: events.filter(event => new Date(event.event_date + 'T00:00:00') > new Date()).length,
      thisMonth: events.filter(event => {
        const eventDate = new Date(event.event_date + 'T00:00:00');
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
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Eventos</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gerencie seus eventos e apresentações</p>
            <div className="flex flex-wrap gap-2 md:gap-4 mt-2">
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                {stats.total} eventos
              </Badge>
              <Badge variant="default" className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                {stats.upcoming} próximos
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Music className="h-3 w-3" />
                {stats.thisMonth} este mês
              </Badge>
            </div>
          </div>
          {(userRole === 'superuser' || userRole === 'band_admin') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="flex items-center gap-2 w-full sm:w-auto text-sm">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Evento</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="event_type">Tipo de Evento</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value: EventType) =>
                      setFormData((prev) => ({ ...prev, event_type: value, name: "" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="culto_domingo">Culto Domingo</SelectItem>
                      <SelectItem value="culto_quarta">Culto Quarta</SelectItem>
                      <SelectItem value="especial">Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.event_type === 'especial' && (
                  <div>
                    <Label htmlFor="name">Nome do Evento (opcional)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Ex: Culto de Páscoa (deixe vazio para 'Culto Especial')"
                    />
                  </div>
                )}
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
                    disabled={userRole !== 'superuser'}
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
                      <SelectItem value="none">Sem líder específico</SelectItem>
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
                <div>
                  <Label htmlFor="lyrics">Letra do Evento</Label>
                  <Textarea
                    id="lyrics"
                    value={formData.lyrics}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lyrics: e.target.value }))
                    }
                    placeholder="Cole aqui a letra completa conforme será tocada no evento..."
                    className="min-h-[150px]"
                  />
                </div>
                
                <EventSongManager
                  eventId={editingEvent?.id}
                  eventSongs={eventSongs}
                  onSongsChange={setEventSongs}
                />
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
          )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="sm:col-span-2 lg:col-span-2">
                  <Input
                    placeholder="Buscar eventos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                  <Select value={selectedBand} onValueChange={setSelectedBand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por banda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as bandas</SelectItem>
                      {bands.map((band) => (
                        <SelectItem key={band.id} value={band.id}>
                          {band.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedSong} onValueChange={setSelectedSong}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por música" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as músicas</SelectItem>
                      {songs.map((song) => (
                        <SelectItem key={song.id} value={song.id}>
                          {song.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedBand("all");
                    setSelectedSong("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="start-date" className="text-sm font-medium">Data inicial</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Data inicial"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date" className="text-sm font-medium">Data final</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Data final"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {showUpcoming ? `Próximos Eventos (${upcomingEvents.length})` : `Eventos Passados (${pastEvents.length})`}
              </h2>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUpcoming(!showUpcoming);
                  setCurrentPage(1);
                }}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {showUpcoming ? 'Ver Eventos Passados' : 'Ver Próximos Eventos'}
              </Button>
            </div>
            
            {(() => {
              const eventsToShow = showUpcoming ? upcomingEvents : pastEvents;
              const totalPages = Math.ceil(eventsToShow.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedEvents = eventsToShow.slice(startIndex, endIndex);

              return (
                <>
                  {eventsToShow.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">
                          {showUpcoming ? 'Nenhum evento próximo encontrado' : 'Nenhum evento passado encontrado'}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onEdit={(userRole === 'superuser' || userRole === 'band_admin') ? handleEdit : undefined}
                            onDelete={(userRole === 'superuser' || userRole === 'band_admin') ? handleDelete : undefined}
                            canManage={(userRole === 'superuser' || userRole === 'band_admin')}
                          />
                        ))}
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
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}