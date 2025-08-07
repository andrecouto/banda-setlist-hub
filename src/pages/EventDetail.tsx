import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Plus, Trash, ArrowUp, ArrowDown, Music, Calendar, Users, Youtube, ChevronLeft } from "lucide-react";

interface Event {
  id: string;
  name: string;
  event_date: string;
  notes: string | null;
  youtube_link: string | null;
  bands: { name: string };
}

interface EventSong {
  id: string;
  song_order: number;
  key_played: string | null;
  is_medley: boolean | null;
  medley_group: number | null;
  songs: {
    id: string;
    name: string;
    key: string | null;
  };
}

interface Song {
  id: string;
  name: string;
  key: string | null;
}

interface EventParticipant {
  id: string;
  participant_id: string;
  instrument: string | null;
  profiles: {
    id: string;
    name: string;
  };
}

interface Profile {
  id: string;
  name: string;
}

export default function EventDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [eventSongs, setEventSongs] = useState<EventSong[]>([]);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSongDialogOpen, setIsAddSongDialogOpen] = useState(false);
  const [isAddParticipantDialogOpen, setIsAddParticipantDialogOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [instrument, setInstrument] = useState("");
  const [isMedley, setIsMedley] = useState(false);
  const [medleyGroup, setMedleyGroup] = useState("");

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchEventSongs();
      fetchAvailableSongs();
      fetchEventParticipants();
      fetchAvailableProfiles();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          bands(name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar evento",
        variant: "destructive",
      });
    }
  };

  const fetchEventSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("event_songs")
        .select(`
          *,
          songs(id, name, key)
        `)
        .eq("event_id", id)
        .order("song_order");

      if (error) throw error;
      setEventSongs(data || []);
    } catch (error) {
      console.error("Error fetching event songs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("name");

      if (error) throw error;
      setAvailableSongs(data || []);
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const fetchEventParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("event_participants")
        .select(`
          *,
          profiles(id, name)
        `)
        .eq("event_id", id);

      if (error) throw error;
      setEventParticipants(data || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const fetchAvailableProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setAvailableProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const addSongToEvent = async () => {
    if (!selectedSongId) return;

    try {
      const nextOrder = eventSongs.length > 0 ? Math.max(...eventSongs.map(es => es.song_order)) + 1 : 1;
      const nextMedleyGroup = isMedley && medleyGroup ? parseInt(medleyGroup) : null;

      const { error } = await supabase
        .from("event_songs")
        .insert({
          event_id: id,
          song_id: selectedSongId,
          song_order: nextOrder,
          key_played: customKey || null,
          is_medley: isMedley,
          medley_group: nextMedleyGroup,
        });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Música adicionada ao setlist!" });
      setSelectedSongId("");
      setCustomKey("");
      setIsMedley(false);
      setMedleyGroup("");
      setIsAddSongDialogOpen(false);
      fetchEventSongs();
    } catch (error) {
      console.error("Error adding song:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar música",
        variant: "destructive",
      });
    }
  };

  const removeSongFromEvent = async (eventSongId: string) => {
    try {
      const { error } = await supabase
        .from("event_songs")
        .delete()
        .eq("id", eventSongId);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Música removida do setlist!" });
      fetchEventSongs();
    } catch (error) {
      console.error("Error removing song:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover música",
        variant: "destructive",
      });
    }
  };

  const updateSongOrder = async (eventSongId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from("event_songs")
        .update({ song_order: newOrder })
        .eq("id", eventSongId);

      if (error) throw error;
      fetchEventSongs();
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      const currentSong = eventSongs[index];
      const prevSong = eventSongs[index - 1];
      
      updateSongOrder(currentSong.id, prevSong.song_order);
      updateSongOrder(prevSong.id, currentSong.song_order);
    }
  };

  const moveDown = (index: number) => {
    if (index < eventSongs.length - 1) {
      const currentSong = eventSongs[index];
      const nextSong = eventSongs[index + 1];
      
      updateSongOrder(currentSong.id, nextSong.song_order);
      updateSongOrder(nextSong.id, currentSong.song_order);
    }
  };

  const addParticipantToEvent = async () => {
    if (!selectedProfileId) return;

    try {
      const { error } = await supabase
        .from("event_participants")
        .insert({
          event_id: id,
          participant_id: selectedProfileId,
          instrument: instrument || null,
        });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Participante adicionado ao evento!" });
      setSelectedProfileId("");
      setInstrument("");
      setIsAddParticipantDialogOpen(false);
      fetchEventParticipants();
    } catch (error) {
      console.error("Error adding participant:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar participante",
        variant: "destructive",
      });
    }
  };

  const removeParticipantFromEvent = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Participante removido do evento!" });
      fetchEventParticipants();
    } catch (error) {
      console.error("Error removing participant:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover participante",
        variant: "destructive",
      });
    }
  };

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

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center">Evento não encontrado</div>
        </div>
      </div>
    );
  }

  const medleyGroups = [...new Set(eventSongs.filter(es => es.is_medley).map(es => es.medley_group))].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Link to="/events">
            <Button variant="outline" className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar aos Eventos
            </Button>
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.event_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.bands.name}
                </div>
                {event.youtube_link && (
                  <a 
                    href={event.youtube_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </a>
                )}
              </div>
              {event.notes && (
                <p className="mt-2 text-muted-foreground">{event.notes}</p>
              )}
            </div>

            <Dialog open={isAddSongDialogOpen} onOpenChange={setIsAddSongDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Música
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Música ao Setlist</DialogTitle>
                  <DialogDescription>
                    Escolha uma música para adicionar ao evento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="song">Música</Label>
                    <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma música" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSongs.map((song) => (
                          <SelectItem key={song.id} value={song.id}>
                            {song.name} {song.key && `(${song.key})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="key">Tom (opcional)</Label>
                    <Input
                      id="key"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="Ex: C, Dm, F#"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="medley"
                      checked={isMedley}
                      onCheckedChange={(checked) => setIsMedley(checked === true)}
                    />
                    <Label htmlFor="medley">Faz parte de um medley</Label>
                  </div>

                  {isMedley && (
                    <div>
                      <Label htmlFor="medley_group">Grupo do Medley</Label>
                      <Input
                        id="medley_group"
                        type="number"
                        value={medleyGroup}
                        onChange={(e) => setMedleyGroup(e.target.value)}
                        placeholder="1, 2, 3..."
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={addSongToEvent} className="flex-1">
                      Adicionar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddSongDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Setlist</CardTitle>
              <CardDescription>
                {eventSongs.length} música(s) no evento
                {medleyGroups.length > 0 && ` • ${medleyGroups.length} medley(s)`}
              </CardDescription>
            </CardHeader>
          <CardContent>
            {eventSongs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma música adicionada ao setlist</p>
                <p className="text-sm">Clique em "Adicionar Música" para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Música</TableHead>
                    <TableHead>Tom</TableHead>
                    <TableHead>Medley</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventSongs.map((eventSong, index) => (
                    <TableRow key={eventSong.id}>
                      <TableCell className="font-medium">
                        {eventSong.song_order}
                      </TableCell>
                      <TableCell>{eventSong.songs.name}</TableCell>
                      <TableCell>
                        {eventSong.key_played || eventSong.songs.key || "-"}
                      </TableCell>
                      <TableCell>
                        {eventSong.is_medley && (
                          <Badge variant="secondary">
                            Medley {eventSong.medley_group}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveDown(index)}
                            disabled={index === eventSongs.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeSongFromEvent(eventSong.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Participantes</CardTitle>
                <CardDescription>
                  {eventParticipants.length} participante(s) no evento
                </CardDescription>
              </div>
              <Dialog open={isAddParticipantDialogOpen} onOpenChange={setIsAddParticipantDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Participante
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Participante ao Evento</DialogTitle>
                    <DialogDescription>
                      Escolha um membro para participar do evento
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="participant">Participante</Label>
                      <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um participante" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProfiles
                            .filter(profile => !eventParticipants.some(ep => ep.participant_id === profile.id))
                            .map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="instrument">Instrumento (opcional)</Label>
                      <Input
                        id="instrument"
                        value={instrument}
                        onChange={(e) => setInstrument(e.target.value)}
                        placeholder="Ex: Guitarra, Baixo, Bateria, Vocal"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={addParticipantToEvent} className="flex-1">
                        Adicionar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddParticipantDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {eventParticipants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum participante adicionado</p>
                <p className="text-sm">Clique em "Adicionar Participante" para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Instrumento</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.profiles.name}
                      </TableCell>
                      <TableCell>
                        {participant.instrument || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeParticipantFromEvent(participant.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}