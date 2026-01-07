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
import { Plus, Trash, ArrowUp, ArrowDown, Music, Calendar, Users, Youtube, ChevronLeft, Copy } from "lucide-react";

type EventType = 'culto_domingo' | 'culto_quarta' | 'especial';

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_type?: EventType;
  notes: string | null;
  youtube_link: string | null;
  lyrics: string | null;
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

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    name: string;
  };
}

export default function EventDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [eventSongs, setEventSongs] = useState<EventSong[]>([]);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSongDialogOpen, setIsAddSongDialogOpen] = useState(false);
  const [isAddParticipantDialogOpen, setIsAddParticipantDialogOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [instrument, setInstrument] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isMedley, setIsMedley] = useState(false);
  const [medleyGroup, setMedleyGroup] = useState("");
  const [userRole, setUserRole] = useState<string>('band_member');
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchEventSongs();
      fetchAvailableSongs();
      fetchEventParticipants();
      fetchAvailableProfiles();
      fetchComments();
      fetchUserRole();
    }
  }, [id]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role);
      setCurrentUserProfileId(data.id);
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

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

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles(id, name)
        `)
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Erro",
          description: "Perfil do usuário não encontrado",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("comments")
        .insert({
          content: newComment.trim(),
          event_id: id,
          user_id: profile.id,
        });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Comentário adicionado!" });
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive",
      });
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

  const deleteComment = async (commentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Comentário excluído!" });
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir comentário",
        variant: "destructive",
      });
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingComment(null);
    setEditCommentContent("");
  };

  const saveEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;

    try {
      const { error } = await supabase
        .from("comments")
        .update({ content: editCommentContent.trim() })
        .eq("id", commentId);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Comentário atualizado!" });
      setEditingComment(null);
      setEditCommentContent("");
      fetchComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar comentário",
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

  // URL de compartilhamento do WhatsApp (abre em nova guia para evitar bloqueios/iframe)
  // Mensagem e URLs de compartilhamento do WhatsApp
  const shareMessage = (() => {
    if (!event) return '';
    const formattedDate = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    let message = `🎵 *${event.name}*\n`;
    message += `📅 ${formattedDate}\n`;
    message += `🎸 Banda: ${event.bands.name}\n`;
    if (eventSongs.length > 0) {
      message += `\n*Setlist (${eventSongs.length} músicas):*\n`;
      eventSongs.forEach((eventSong, index) => {
        message += `${index + 1}. ${eventSong.songs.name}`;
        if (eventSong.key_played) message += ` (${eventSong.key_played})`;
        if (eventSong.is_medley) message += ` [Medley]`;
        message += '\n';
      });
    }
    if (event.notes) message += `\n📝 ${event.notes}\n`;
    return message;
  })();

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const whatsappUrlAlt = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

  const handleShareClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareMessage });
        e.preventDefault();
        return;
      } catch {}
    }
    try {
      const urls = [whatsappUrl, whatsappUrlAlt];
      for (const url of urls) {
        const win = window.top?.open(url, '_blank', 'noopener,noreferrer');
        if (win) {
          e.preventDefault();
          return;
        }
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast({ title: "Mensagem copiada", description: "Abra o WhatsApp e cole a mensagem." });
      e.preventDefault();
    } catch {}
  };

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
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                {event.name}
                {event.event_type === 'especial' && (
                  <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">
                    Especial
                  </Badge>
                )}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.event_date + 'T00:00:00').toLocaleDateString()}
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

              
              <div className="flex gap-2">
                {(userRole === 'superuser' || userRole === 'band_admin') && (
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
              )}
            </div>
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
                        {(userRole === 'superuser' || userRole === 'band_admin') ? (
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
                        ) : (
                          <span className="text-sm text-muted-foreground">Visualização</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {event.lyrics && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Letra do Evento</CardTitle>
                  <CardDescription>
                    Letra completa conforme será tocada
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(event.lyrics || "");
                    toast({
                      title: "Copiado!",
                      description: "Letra copiada para a área de transferência.",
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground bg-muted/50 p-4 rounded-lg">
                {event.lyrics}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Participantes</CardTitle>
                <CardDescription>
                  {eventParticipants.length} participante(s) no evento
                </CardDescription>
              </div>
                {(userRole === 'superuser' || userRole === 'band_admin') && (
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
                )}
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
                        {(userRole === 'superuser' || userRole === 'band_admin') ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeParticipantFromEvent(participant.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
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
            <CardTitle>Comentários e Observações</CardTitle>
            <CardDescription>
              {comments.length} comentário(s) sobre o evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicione um comentário sobre o evento..."
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addComment();
                    }
                  }}
                />
                <Button onClick={addComment} disabled={!newComment.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-2xl mb-2">💬</div>
                  <p>Nenhum comentário ainda</p>
                  <p className="text-sm">Seja o primeiro a comentar sobre este evento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">{comment.profiles.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {(userRole === 'superuser' || comment.user_id === currentUserProfileId) && (
                            <div className="flex gap-1">
                              {editingComment !== comment.id && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => startEditComment(comment)}
                                  >
                                    <Plus className="h-3 w-3 rotate-45" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() => deleteComment(comment.id)}
                                  >
                                    <Trash className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {editingComment === comment.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => saveEditComment(comment.id)}
                            disabled={!editCommentContent.trim()}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditComment}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm">{comment.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}