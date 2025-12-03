import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Music, X, Link } from "lucide-react";

interface Song {
  id: string;
  name: string;
  key: string | null;
}

interface EventSong {
  id?: string;
  song_id: string;
  song_order: number;
  key_played: string | null;
  is_medley?: boolean;
  medley_group?: number | null;
  song: Song;
}

interface EventSongManagerProps {
  eventId?: string;
  eventSongs: EventSong[];
  onSongsChange: (songs: EventSong[]) => void;
  disabled?: boolean;
}

export function EventSongManager({ eventId, eventSongs, onSongsChange, disabled = false }: EventSongManagerProps) {
  const { toast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateSongOpen, setIsCreateSongOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [keyPlayed, setKeyPlayed] = useState("");
  const [isMedley, setIsMedley] = useState(false);
  const [selectedMedleyGroup, setSelectedMedleyGroup] = useState<string>("new");
  const [newSongData, setNewSongData] = useState({ name: "", key: "" });

  // Get existing medley groups
  const existingMedleyGroups = Array.from(
    new Set(
      eventSongs
        .filter(s => s.is_medley && s.medley_group !== null)
        .map(s => s.medley_group as number)
    )
  ).sort((a, b) => a - b);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("id, name, key")
        .order("name");

      if (error) throw error;
      setSongs(data || []);
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const handleAddSong = () => {
    const selectedSong = songs.find(s => s.id === selectedSongId);
    if (!selectedSong) return;

    // Determine medley group if this is a medley song
    let medleyGroup = null;
    if (isMedley) {
      if (selectedMedleyGroup === "new") {
        const maxGroup = existingMedleyGroups.length > 0 ? Math.max(...existingMedleyGroups) : 0;
        medleyGroup = maxGroup + 1;
      } else {
        medleyGroup = parseInt(selectedMedleyGroup, 10);
      }
    }

    const newEventSong: EventSong = {
      song_id: selectedSongId,
      song_order: eventSongs.length + 1,
      key_played: keyPlayed || null,
      is_medley: isMedley,
      medley_group: medleyGroup,
      song: selectedSong
    };

    onSongsChange([...eventSongs, newEventSong]);
      setSelectedSongId("");
      setKeyPlayed("");
      setIsMedley(false);
      setSelectedMedleyGroup("new");
      setIsDialogOpen(false);
  };

  const handleCreateAndAddSong = async () => {
    if (!newSongData.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from("songs")
        .insert({
          name: newSongData.name,
          key: newSongData.key || null
        })
        .select()
        .single();

      if (error) throw error;

      // Determine medley group if this is a medley song
      let medleyGroup = null;
      if (isMedley) {
        if (selectedMedleyGroup === "new") {
          const maxGroup = existingMedleyGroups.length > 0 ? Math.max(...existingMedleyGroups) : 0;
          medleyGroup = maxGroup + 1;
        } else {
          medleyGroup = parseInt(selectedMedleyGroup, 10);
        }
      }

      const newEventSong: EventSong = {
        song_id: data.id,
        song_order: eventSongs.length + 1,
        key_played: keyPlayed || null,
        is_medley: isMedley,
        medley_group: medleyGroup,
        song: data
      };

      onSongsChange([...eventSongs, newEventSong]);
      setSongs([...songs, data]);
      setNewSongData({ name: "", key: "" });
      setKeyPlayed("");
      setIsMedley(false);
      setSelectedMedleyGroup("new");
      setIsCreateSongOpen(false);
      
      toast({ title: "Sucesso", description: "Música criada e adicionada ao evento!" });
    } catch (error) {
      console.error("Error creating song:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar música",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSong = (index: number) => {
    const updatedSongs = eventSongs.filter((_, i) => i !== index);
    // Reorder songs
    const reorderedSongs = updatedSongs.map((song, i) => ({
      ...song,
      song_order: i + 1
    }));
    onSongsChange(reorderedSongs);
  };

  const moveSong = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= eventSongs.length) return;

    const updatedSongs = [...eventSongs];
    [updatedSongs[index], updatedSongs[newIndex]] = [updatedSongs[newIndex], updatedSongs[index]];
    
    // Update song_order
    const reorderedSongs = updatedSongs.map((song, i) => ({
      ...song,
      song_order: i + 1
    }));
    
    onSongsChange(reorderedSongs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Músicas do Evento</Label>
        {!disabled && (
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Música
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Música ao Evento</DialogTitle>
                  <DialogDescription>
                    Selecione uma música existente para adicionar ao evento
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
                        {songs
                          .filter(song => !eventSongs.find(es => es.song_id === song.id))
                          .map((song) => (
                            <SelectItem key={song.id} value={song.id}>
                              {song.name} {song.key && `(${song.key})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="key_played">Tom a ser tocado</Label>
                    <Input
                      id="key_played"
                      value={keyPlayed}
                      onChange={(e) => setKeyPlayed(e.target.value)}
                      placeholder="Ex: C, D, G#"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_medley"
                        checked={isMedley}
                        onCheckedChange={(checked) => {
                          setIsMedley(checked as boolean);
                          if (!checked) setSelectedMedleyGroup("new");
                        }}
                      />
                      <Label htmlFor="is_medley" className="text-sm cursor-pointer">
                        Parte de um medley
                      </Label>
                    </div>
                    {isMedley && (
                      <div>
                        <Label htmlFor="medley_group">Grupo do Medley</Label>
                        <Select value={selectedMedleyGroup} onValueChange={setSelectedMedleyGroup}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Novo Medley</SelectItem>
                            {existingMedleyGroups.map((group) => {
                              const songsInGroup = eventSongs.filter(s => s.medley_group === group);
                              const groupLabel = songsInGroup.map(s => s.song.name).join(" + ");
                              return (
                                <SelectItem key={group} value={group.toString()}>
                                  Medley {group}: {groupLabel || "Vazio"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleAddSong} disabled={!selectedSongId}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateSongOpen} onOpenChange={setIsCreateSongOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Música
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Música</DialogTitle>
                  <DialogDescription>
                    Crie uma nova música e adicione ao evento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new_song_name">Nome da Música</Label>
                    <Input
                      id="new_song_name"
                      value={newSongData.name}
                      onChange={(e) =>
                        setNewSongData(prev => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Nome da música"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_song_key">Tom Original</Label>
                    <Input
                      id="new_song_key"
                      value={newSongData.key}
                      onChange={(e) =>
                        setNewSongData(prev => ({ ...prev, key: e.target.value }))
                      }
                      placeholder="Ex: C, D, G#"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_key_played">Tom a ser tocado</Label>
                    <Input
                      id="new_key_played"
                      value={keyPlayed}
                      onChange={(e) => setKeyPlayed(e.target.value)}
                      placeholder="Ex: C, D, G#"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new_is_medley"
                        checked={isMedley}
                        onCheckedChange={(checked) => {
                          setIsMedley(checked as boolean);
                          if (!checked) setSelectedMedleyGroup("new");
                        }}
                      />
                      <Label htmlFor="new_is_medley" className="text-sm cursor-pointer">
                        Parte de um medley
                      </Label>
                    </div>
                    {isMedley && (
                      <div>
                        <Label htmlFor="new_medley_group">Grupo do Medley</Label>
                        <Select value={selectedMedleyGroup} onValueChange={setSelectedMedleyGroup}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Novo Medley</SelectItem>
                            {existingMedleyGroups.map((group) => {
                              const songsInGroup = eventSongs.filter(s => s.medley_group === group);
                              const groupLabel = songsInGroup.map(s => s.song.name).join(" + ");
                              return (
                                <SelectItem key={group} value={group.toString()}>
                                  Medley {group}: {groupLabel || "Vazio"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateSongOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateAndAddSong} disabled={!newSongData.name.trim()}>
                      Criar e Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {eventSongs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-6">
            <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma música adicionada ao evento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {eventSongs.map((eventSong, index) => (
            <Card 
              key={`${eventSong.song_id}-${index}`} 
              className={`p-3 ${eventSong.is_medley ? 'border-l-4 border-l-primary' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {eventSong.song_order}
                  </Badge>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{eventSong.song.name}</p>
                      {eventSong.is_medley && (
                        <Badge variant="outline" className="text-xs">
                          <Link className="h-3 w-3 mr-1" />
                          Medley
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {eventSong.song.key && (
                        <span>Original: {eventSong.song.key}</span>
                      )}
                      {eventSong.key_played && (
                        <span>Tocará em: {eventSong.key_played}</span>
                      )}
                    </div>
                  </div>
                </div>
                {!disabled && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveSong(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveSong(index, 'down')}
                      disabled={index === eventSongs.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveSong(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
