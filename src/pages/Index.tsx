import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Music, Users, TrendingUp, Clock, Star, BarChart3, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatsCard } from '@/components/StatsCard';
import { Navigation } from '@/components/Navigation';

const Index = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalBands: 0,
    totalEvents: 0,
    totalSongs: 0,
    thisMonthEvents: 0,
    topSongs: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (userProfile) {
      fetchStats();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*, bands:band_id(name)')
      .eq('user_id', user.id)
      .single();
    
    setUserProfile(data);
  };

  const fetchStats = async () => {
    if (!userProfile) return;
    
    try {
      if (userProfile.role === 'superuser') {
        // Admin sees all stats
        const [bandsResult, eventsResult, songsResult, thisMonthResult] = await Promise.all([
          supabase.from('bands').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('songs').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true })
            .gte('event_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        ]);

        setStats({
          totalBands: bandsResult.count || 0,
          totalEvents: eventsResult.count || 0,
          totalSongs: songsResult.count || 0,
          thisMonthEvents: thisMonthResult.count || 0,
          topSongs: []
        });
      } else {
        // Regular user sees current month's top songs
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const { data: topSongsData } = await supabase
          .from('event_songs')
          .select(`
            song_id,
            songs:song_id(name, key),
            events:event_id(event_date)
          `)
          .gte('events.event_date', startOfMonth.toISOString().split('T')[0])
          .lte('events.event_date', endOfMonth.toISOString().split('T')[0]);

        // Count song occurrences
        const songCounts = (topSongsData || []).reduce((acc: any, item: any) => {
          const songId = item.song_id;
          if (!acc[songId]) {
            acc[songId] = {
              song: item.songs,
              count: 0
            };
          }
          acc[songId].count++;
          return acc;
        }, {});

        const topSongs = Object.values(songCounts)
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalBands: 0,
          totalEvents: 0,
          totalSongs: 0,
          thisMonthEvents: 0,
          topSongs
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="text-lg font-medium">Carregando...</div>
            <div className="text-sm text-muted-foreground">Preparando seu dashboard</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/5">
      <Navigation />
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 animate-pulse-glow">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-gradient font-poppins">
              {userProfile?.role === 'superuser' ? 'Painel Administrativo' : 'Band Manager'}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            {userProfile?.role === 'superuser' 
              ? 'Gerencie todas as bandas e usuários do sistema'
              : userProfile?.bands?.name 
                ? `Bem-vindo à ${userProfile.bands.name}`
                : 'Sistema completo para gerenciamento de bandas e eventos musicais'
            }
          </p>
          {userProfile?.role === 'superuser' && (
            <div className="flex justify-center gap-4">
              <Link to="/user-management">
                <Button className="btn-gradient">
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Usuários
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        {userProfile?.role === 'superuser' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total de Bandas"
              value={stats.totalBands}
              description="Bandas cadastradas no sistema"
              icon={Users}
            />
            <StatsCard
              title="Total de Eventos"
              value={stats.totalEvents}
              description="Eventos já realizados"
              icon={Calendar}
            />
            <StatsCard
              title="Total de Músicas"
              value={stats.totalSongs}
              description="Músicas no repertório"
              icon={Music}
            />
            <StatsCard
              title="Eventos Este Mês"
              value={stats.thisMonthEvents}
              description={`Eventos realizados em ${new Date().toLocaleString('pt-BR', { month: 'long' })}`}
              icon={TrendingUp}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="card-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Músicas do Mês - {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <CardDescription>
                  Músicas mais tocadas este mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topSongs.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topSongs.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.song.name}</p>
                            {item.song.key && (
                              <p className="text-sm text-muted-foreground">Tom: {item.song.key}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{item.count}x</p>
                          <p className="text-xs text-muted-foreground">tocadas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma música tocada este mês</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/bands">
            <Card className="card-glass hover:card-hover transition-all duration-300 cursor-pointer group">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Bandas</h3>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.role === 'superuser' ? 'Gerencie todas as bandas' : 'Visualize bandas'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/events">
            <Card className="card-glass hover:card-hover transition-all duration-300 cursor-pointer group">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Eventos</h3>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.role === 'superuser' ? 'Organize e gerencie eventos' : 'Visualize eventos'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/songs">
            <Card className="card-glass hover:card-hover transition-all duration-300 cursor-pointer group">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Music className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Músicas</h3>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.role === 'superuser' ? 'Gerencie repertório musical' : 'Visualize repertório'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile">
            <Card className="card-glass hover:card-hover transition-all duration-300 cursor-pointer group">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Perfil</h3>
                <p className="text-sm text-muted-foreground">
                  Configure sua conta e preferências
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;