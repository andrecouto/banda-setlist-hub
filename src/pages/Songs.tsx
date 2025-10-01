import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { SongCard } from "@/components/SongCard";
import { Plus, Search, Grid, List, Filter, Music, Users } from "lucide-react";

interface Song {
  id: string;
  name: string;
  key: string | null;
  author: string | null;
  lyrics: string | null;
  created_at: string;
  usage_count?: number;
  last_played?: string;
  medleys?: Array<{
    event_name: string;
    key_played: string | null;
  }>;
}

interface Band {
  id: string;
  name: string;
}

export default function Songs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [formData, setFormData] = useState({ name: "", key: "", author: "", lyrics: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [keyFilter, setKeyFilter] = useState<string>("all");
  const [bandFilter, setBandFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'key' | 'recent' | 'popular'>('name');
  const [userRole, setUserRole] = useState<string>('band_member');

  useEffect(() => {
    fetchSongs();
    fetchBands();
    fetchUserRole();
  }, []);

  useEffect(() => {
    filterAndSortSongs();
  }, [songs, searchTerm, keyFilter, bandFilter, sortBy]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
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

  const fetchSongs = async () => {
    try {
      // Fetch songs with usage statistics and medley information
      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select(`
          *,
          event_songs!song_id(
            key_played,
            events(name)
          )
        `)
        .order("name", { ascending: true });

      if (songsError) throw songsError;

      // Transform data to include usage counts and medley info
      const songsWithStats = songsData?.map(song => {
        const eventSongs = song.event_songs || [];
        return {
          ...song,
          usage_count: eventSongs.length,
          medleys: eventSongs
            .filter(es => es.key_played)
            .map(es => ({
              event_name: es.events?.name || 'Evento desconhecido',
              key_played: es.key_played
            })),
          last_played: null
        };
      }) || [];

      setSongs(songsWithStats);
    } catch (error) {
      console.error("Error fetching songs:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar músicas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortSongs = () => {
    let filtered = songs.filter(song => {
      const matchesSearch = song.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKey = keyFilter === "all" || song.key === keyFilter;
      return matchesSearch && matchesKey;
    });

    // Sort songs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'key':
          return (a.key || '').localeCompare(b.key || '');
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return (b.usage_count || 0) - (a.usage_count || 0);
        default:
          return 0;
      }
    });

    setFilteredSongs(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingSong) {
        const { error } = await supabase
          .from("songs")
          .update({
            name: formData.name,
            key: formData.key || null,
            author: formData.author || null,
            lyrics: formData.lyrics || null,
          })
          .eq("id", editingSong.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Música atualizada!" });
      } else {
        const { error } = await supabase
          .from("songs")
          .insert({
            name: formData.name,
            key: formData.key || null,
            author: formData.author || null,
            lyrics: formData.lyrics || null,
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Música criada!" });
      }

      setFormData({ name: "", key: "", author: "", lyrics: "" });
      setEditingSong(null);
      setIsDialogOpen(false);
      fetchSongs();
    } catch (error) {
      console.error("Error saving song:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar música",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (song: Song) => {
    setEditingSong(song);
    setFormData({ 
      name: song.name, 
      key: song.key || "",
      author: song.author || "",
      lyrics: song.lyrics || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta música?")) return;

    try {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Música excluída!" });
      fetchSongs();
    } catch (error) {
      console.error("Error deleting song:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir música",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingSong(null);
    setFormData({ name: "", key: "", author: "", lyrics: "" });
    setIsDialogOpen(true);
  };

  const getUniqueKeys = () => {
    const keys = songs.map(song => song.key).filter(Boolean);
    return [...new Set(keys)];
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Músicas</h1>
            <p className="text-muted-foreground">Gerencie o repertório musical</p>
          </div>
          {userRole === 'superuser' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Música
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSong ? "Editar Música" : "Nova Música"}
                </DialogTitle>
                <DialogDescription>
                  {editingSong
                    ? "Atualize as informações da música"
                    : "Adicione uma nova música ao repertório"}
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
                    placeholder="Nome da música"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="author">Autor</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, author: e.target.value }))
                    }
                    placeholder="Nome do autor/compositor (opcional)"
                  />
                </div>
                <div>
                  <Label htmlFor="key">Tom</Label>
                  <Input
                    id="key"
                    value={formData.key}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, key: e.target.value }))
                    }
                    placeholder="Ex: C, Dm, F#"
                  />
                </div>
                <div>
                  <Label htmlFor="lyrics">Letra</Label>
                  <Input
                    id="lyrics"
                    value={formData.lyrics}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lyrics: e.target.value }))
                    }
                    placeholder="Letra da música (opcional)"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingSong ? "Atualizar" : "Criar"}
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

        {/* Search and Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar músicas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={keyFilter} onValueChange={setKeyFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Tom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getUniqueKeys().map(key => (
                      <SelectItem key={key} value={key!}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={bandFilter} onValueChange={setBandFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Banda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {bands.map(band => (
                      <SelectItem key={band.id} value={band.id}>{band.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="key">Tom</SelectItem>
                    <SelectItem value="recent">Recentes</SelectItem>
                    <SelectItem value="popular">Populares</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{songs.length}</div>
              <p className="text-xs text-muted-foreground">músicas cadastradas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tons</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueKeys().length}</div>
              <p className="text-xs text-muted-foreground">tons diferentes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filtradas</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSongs.length}</div>
              <p className="text-xs text-muted-foreground">resultados encontrados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mais Tocada</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(...songs.map(s => s.usage_count || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">execuções</p>
            </CardContent>
          </Card>
        </div>

        {/* Songs Display */}
        {filteredSongs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {songs.length === 0 ? "Nenhuma música cadastrada" : "Nenhuma música encontrada"}
                </h3>
                <p className="mb-4">
                  {songs.length === 0 
                    ? "Comece adicionando suas primeiras músicas" 
                    : "Tente ajustar os filtros de busca"
                  }
                </p>
                {songs.length === 0 && userRole === 'superuser' && (
                  <Button onClick={openCreateDialog} className="flex items-center gap-2 mx-auto">
                    <Plus className="h-4 w-4" />
                    Nova Música
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Todas ({filteredSongs.length})</TabsTrigger>
              <TabsTrigger value="favorites">Mais Tocadas</TabsTrigger>
              <TabsTrigger value="recent">Recentes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onEdit={userRole === 'superuser' ? handleEdit : undefined}
                      onDelete={userRole === 'superuser' ? handleDelete : undefined}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4">Nome</th>
                            <th className="text-left p-4">Tom</th>
                            <th className="text-left p-4">Execuções</th>
                            <th className="text-left p-4">Criada em</th>
                            <th className="text-left p-4">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSongs.map((song) => (
                            <tr key={song.id} className="border-b hover:bg-muted/50">
                              <td className="p-4 font-medium">{song.name}</td>
                              <td className="p-4">{song.key || "-"}</td>
                              <td className="p-4">{song.usage_count || 0}</td>
                              <td className="p-4">
                                {new Date(song.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                 <div className="flex gap-1">
                                   {userRole === 'superuser' ? (
                                     <>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => handleEdit(song)}
                                       >
                                         Editar
                                       </Button>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => handleDelete(song.id)}
                                       >
                                         Excluir
                                       </Button>
                                     </>
                                   ) : (
                                     <span className="text-sm text-muted-foreground">
                                       Visualização
                                     </span>
                                   )}
                                 </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="favorites">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSongs
                  .filter(song => (song.usage_count || 0) > 0)
                  .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
                  .map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="recent">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSongs
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 12)
                  .map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}