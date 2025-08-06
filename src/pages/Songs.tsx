import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Plus, Edit, Trash } from "lucide-react";

interface Song {
  id: string;
  name: string;
  key: string | null;
  created_at: string;
}

export default function Songs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [formData, setFormData] = useState({ name: "", key: "" });

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setSongs(data || []);
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
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Música criada!" });
      }

      setFormData({ name: "", key: "" });
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
    setFormData({ name: song.name, key: song.key || "" });
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
    setFormData({ name: "", key: "" });
    setIsDialogOpen(true);
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
            <p className="text-muted-foreground">Gerencie o repertório</p>
          </div>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repertório</CardTitle>
            <CardDescription>
              {songs.length} música(s) cadastrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {songs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma música cadastrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tom</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {songs.map((song) => (
                    <TableRow key={song.id}>
                      <TableCell className="font-medium">{song.name}</TableCell>
                      <TableCell>{song.key || "-"}</TableCell>
                      <TableCell>
                        {new Date(song.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(song)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(song.id)}
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
      </div>
    </div>
  );
}