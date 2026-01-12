import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash, Tag } from "lucide-react";

interface TagData {
  id: string;
  name: string;
  color: string;
  created_at: string;
  song_count?: number;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
];

export default function Tags() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
  });
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data: tagsData, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;

      // Get song counts for each tag
      const tagsWithCounts = await Promise.all(
        (tagsData || []).map(async (tag) => {
          const { count } = await supabase
            .from("song_tags")
            .select("*", { count: "exact", head: true })
            .eq("tag_id", tag.id);
          return { ...tag, song_count: count || 0 };
        })
      );

      setTags(tagsWithCounts);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tags",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome da tag é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTag) {
        const { error } = await supabase
          .from("tags")
          .update({
            name: formData.name.trim(),
            color: formData.color,
          })
          .eq("id", editingTag.id);

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: "Tag atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase.from("tags").insert({
          name: formData.name.trim(),
          color: formData.color,
          created_by: user?.id,
        });

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: "Tag criada com sucesso.",
        });
      }

      setDialogOpen(false);
      setEditingTag(null);
      setFormData({ name: "", color: "#3b82f6" });
      fetchTags();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tag: TagData) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("tags").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Tag excluída com sucesso.",
      });
      fetchTags();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    setFormData({ name: "", color: "#3b82f6" });
    setDialogOpen(true);
  };

  const canManageTags = userRole === "superuser" || userRole === "band_admin";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tags</h1>
            <p className="text-muted-foreground">
              Gerencie as tags para organizar suas músicas
            </p>
          </div>

          {canManageTags && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTag ? "Editar Tag" : "Nova Tag"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTag
                      ? "Atualize as informações da tag."
                      : "Crie uma nova tag para organizar suas músicas."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Tag *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Adoração, Celebração, Natal..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor da Tag</Label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border-2 border-border"
                        style={{ backgroundColor: formData.color }}
                      />
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            formData.color === color
                              ? "border-foreground"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, color })}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingTag ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {tags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma tag criada
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie tags para organizar suas músicas por categorias.
              </p>
              {canManageTags && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira tag
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tags.map((tag) => (
              <Card key={tag.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <CardTitle className="text-lg">{tag.name}</CardTitle>
                    </div>
                    {canManageTags && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A tag será
                                removida de todas as músicas associadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(tag.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>
                    {tag.song_count === 0
                      ? "Nenhuma música"
                      : tag.song_count === 1
                      ? "1 música"
                      : `${tag.song_count} músicas`}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
