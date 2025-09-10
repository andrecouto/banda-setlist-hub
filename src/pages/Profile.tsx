import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { User, Music, Calendar, Users, Settings } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'band_member' | 'superuser';
  band_id: string | null;
  bands?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface Band {
  id: string;
  name: string;
  description: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [availableBands, setAvailableBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [selectedBandId, setSelectedBandId] = useState("none");

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAvailableBands();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          bands(id, name, description)
        `)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setName(data.name);
      setSelectedBandId(data.band_id || "none");
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBands = async () => {
    try {
      const { data, error } = await supabase
        .from("bands")
        .select("*")
        .order("name");

      if (error) throw error;
      setAvailableBands(data || []);
    } catch (error) {
      console.error("Error fetching bands:", error);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          band_id: selectedBandId === "none" ? null : selectedBandId,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
      
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center">Perfil não encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize suas informações básicas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                <div>
                  <Label htmlFor="band">Banda</Label>
                  <Select value={selectedBandId} onValueChange={setSelectedBandId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma banda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma banda</SelectItem>
                      {availableBands.map((band) => (
                        <SelectItem key={band.id} value={band.id}>
                          {band.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={updateProfile} 
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Resumo do Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{profile.name}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p className="font-medium">{profile.email}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Tipo de usuário</p>
                  <Badge variant={profile.role === 'superuser' ? 'default' : 'secondary'}>
                    {profile.role === 'superuser' ? 'Administrador' : 'Membro da Banda'}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Banda</p>
                  {profile.bands ? (
                    <div>
                      <p className="font-medium">{profile.bands.name}</p>
                      {profile.bands.description && (
                        <p className="text-sm text-muted-foreground">{profile.bands.description}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Não associado a nenhuma banda</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/events">
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Eventos
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/songs">
                    <Music className="h-4 w-4 mr-2" />
                    Ver Músicas
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/bands">
                    <Users className="h-4 w-4 mr-2" />
                    Ver Bandas
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}