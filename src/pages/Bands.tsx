import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Plus, Edit, Trash } from "lucide-react";

interface Band {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Bands() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<Band | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchBands();
  }, []);

  const fetchBands = async () => {
    try {
      const { data, error } = await supabase
        .from("bands")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBands(data || []);
    } catch (error) {
      console.error("Error fetching bands:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar bandas",
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
      if (editingBand) {
        const { error } = await supabase
          .from("bands")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingBand.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Banda atualizada!" });
      } else {
        const { error } = await supabase
          .from("bands")
          .insert({
            name: formData.name,
            description: formData.description || null,
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Banda criada!" });
      }

      setFormData({ name: "", description: "" });
      setEditingBand(null);
      setIsDialogOpen(false);
      fetchBands();
    } catch (error) {
      console.error("Error saving band:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar banda",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (band: Band) => {
    setEditingBand(band);
    setFormData({ name: band.name, description: band.description || "" });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta banda?")) return;

    try {
      const { error } = await supabase.from("bands").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Banda excluída!" });
      fetchBands();
    } catch (error) {
      console.error("Error deleting band:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir banda",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingBand(null);
    setFormData({ name: "", description: "" });
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
            <h1 className="text-3xl font-bold text-foreground">Bandas</h1>
            <p className="text-muted-foreground">Gerencie suas bandas</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Banda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBand ? "Editar Banda" : "Nova Banda"}
                </DialogTitle>
                <DialogDescription>
                  {editingBand
                    ? "Atualize as informações da banda"
                    : "Crie uma nova banda"}
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
                    placeholder="Nome da banda"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Descrição da banda"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingBand ? "Atualizar" : "Criar"}
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
            <CardTitle>Lista de Bandas</CardTitle>
            <CardDescription>
              {bands.length} banda(s) cadastrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma banda cadastrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bands.map((band) => (
                    <TableRow key={band.id}>
                      <TableCell className="font-medium">{band.name}</TableCell>
                      <TableCell>{band.description || "-"}</TableCell>
                      <TableCell>
                        {new Date(band.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(band)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(band.id)}
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