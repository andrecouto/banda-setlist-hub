import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { BandCard } from "@/components/BandCard";
import { Plus, Grid, List } from "lucide-react";

interface Band {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count?: number;
  event_count?: number;
  song_count?: number;
}

export default function Bands() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<Band | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userRole, setUserRole] = useState<string>('band_member');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchBands();
    fetchUserRole();
  }, []);

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
      // Fetch bands with aggregated counts
      const { data: bandsData, error: bandsError } = await supabase
        .from("bands")
        .select(`
          *,
          profiles!band_id(count),
          events!band_id(count)
        `)
        .order("created_at", { ascending: false });

      if (bandsError) throw bandsError;

      // Transform data to include counts
      const bandsWithCounts = bandsData?.map(band => ({
        ...band,
        member_count: band.profiles?.length || 0,
        event_count: band.events?.length || 0,
        song_count: 0 // Would need to implement song-band relationship
      })) || [];

      setBands(bandsWithCounts);
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
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bandas</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gerencie suas bandas</p>
          </div>
          <div className="flex items-center gap-2">
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
            {userRole === 'superuser' && (
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
            )}
          </div>
        </div>

        {bands.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma banda cadastrada</h3>
                <p className="mb-4">Comece criando sua primeira banda</p>
                {userRole === 'superuser' && (
                  <Button onClick={openCreateDialog} className="flex items-center gap-2 mx-auto">
                    <Plus className="h-4 w-4" />
                    Nova Banda
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {bands.length} banda(s) encontrada(s)
              </p>
            </div>
            
            {(() => {
              const totalPages = Math.ceil(bands.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedBands = bands.slice(startIndex, endIndex);

              return (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {paginatedBands.map((band) => (
                        <BandCard
                          key={band.id}
                          band={band}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          canManage={userRole === 'superuser'}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Lista de Bandas</CardTitle>
                        <CardDescription>
                          Visualização em tabela
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                          <table className="w-full min-w-[600px]">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Nome</th>
                                <th className="text-left p-2">Membros</th>
                                <th className="text-left p-2">Eventos</th>
                                <th className="text-left p-2">Criada em</th>
                                {userRole === 'superuser' && <th className="text-left p-2">Ações</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedBands.map((band) => (
                                <tr key={band.id} className="border-b hover:bg-muted/50">
                                  <td className="p-2">
                                    <div>
                                      <div className="font-medium">{band.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {band.description || "Sem descrição"}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-2">{band.member_count || 0}</td>
                                  <td className="p-2">{band.event_count || 0}</td>
                                  <td className="p-2">
                                    {new Date(band.created_at).toLocaleDateString()}
                                  </td>
                                  {userRole === 'superuser' && (
                                    <td className="p-2">
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEdit(band)}
                                        >
                                          Editar
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(band.id)}
                                        >
                                          Excluir
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

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
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}