import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Music, Calendar, Users, TrendingUp, Clock, MessageSquare, Eye } from "lucide-react";

interface DashboardStats {
  totalEvents: number;
  totalSongs: number;
  totalBands: number;
  totalComments: number;
}

interface UpcomingEvent {
  id: string;
  name: string;
  event_date: string;
  bands: { name: string };
}

interface RecentEvent {
  id: string;
  name: string;
  event_date: string;
  bands: { name: string };
}

interface PopularSong {
  id: string;
  name: string;
  key: string | null;
  play_count: number;
}

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalSongs: 0,
    totalBands: 0,
    totalComments: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [popularSongs, setPopularSongs] = useState<PopularSong[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchUpcomingEvents(),
        fetchRecentEvents(),
        fetchPopularSongs(),
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [eventsRes, songsRes, bandsRes, commentsRes] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("songs").select("id", { count: "exact", head: true }),
        supabase.from("bands").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalEvents: eventsRes.count || 0,
        totalSongs: songsRes.count || 0,
        totalBands: bandsRes.count || 0,
        totalComments: commentsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          name,
          event_date,
          bands(name)
        `)
        .gte("event_date", today)
        .order("event_date")
        .limit(5);

      if (error) throw error;
      setUpcomingEvents(data || []);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          name,
          event_date,
          bands(name)
        `)
        .lt("event_date", today)
        .order("event_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentEvents(data || []);
    } catch (error) {
      console.error("Error fetching recent events:", error);
    }
  };

  const fetchPopularSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select(`
          id,
          name,
          key,
          event_songs(id)
        `)
        .limit(10);

      if (error) throw error;
      
      const songsWithCount = (data || []).map(song => ({
        ...song,
        play_count: song.event_songs?.length || 0,
      }))
      .sort((a, b) => b.play_count - a.play_count)
      .slice(0, 5);

      setPopularSongs(songsWithCount);
    } catch (error) {
      console.error("Error fetching popular songs:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto p-6 space-y-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Bem-vindo ao Band Manager, {user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">{/* Stats Cards */}
          <Card className="card-modern hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalEvents}</div>
            </CardContent>
          </Card>

          <Card className="card-modern hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Músicas Cadastradas</CardTitle>
              <Music className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.totalSongs}</div>
            </CardContent>
          </Card>

          <Card className="card-modern hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bandas Ativas</CardTitle>
              <Users className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.totalBands}</div>
            </CardContent>
          </Card>

          <Card className="card-modern hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comentários</CardTitle>
              <MessageSquare className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.totalComments}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-scale-in">
          {/* Upcoming Events */}
          <Card className="card-glass hover-glow">{/* Upcoming Events */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Próximos Eventos
              </CardTitle>
              <CardDescription>
                Eventos programados para os próximos dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum evento próximo
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.bands.name} • {new Date(event.event_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Link to={`/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-glass hover-glow">{/* Recent Events */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Eventos Recentes
              </CardTitle>
              <CardDescription>
                Últimos eventos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum evento recente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.bands.name} • {new Date(event.event_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Link to={`/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Songs */}
          <Card className="card-glass hover-glow">{/* Popular Songs */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Músicas Mais Tocadas
              </CardTitle>
              <CardDescription>
                Ranking das músicas mais populares
              </CardDescription>
            </CardHeader>
            <CardContent>
              {popularSongs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma música tocada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {popularSongs.map((song, index) => (
                    <div key={song.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <h4 className="font-medium">{song.name}</h4>
                          {song.key && (
                            <p className="text-sm text-muted-foreground">Tom: {song.key}</p>
                          )}
                        </div>
                      </div>
                      <Badge>
                        {song.play_count} {song.play_count === 1 ? 'vez' : 'vezes'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-modern">{/* Quick Actions */}
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Acesso rápido às principais funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/events">
                <Button variant="outline" className="w-full justify-start hover-lift">{/* My Profile */}
                  <Calendar className="h-4 w-4 mr-2" />
                  Gerenciar Eventos
                </Button>
              </Link>
              <Link to="/songs">
              <Button variant="outline" className="w-full justify-start hover-lift">{/* Manage Events */}
                  <Music className="h-4 w-4 mr-2" />
                  Ver Músicas
                </Button>
              </Link>
              <Link to="/bands">
                <Button variant="outline" className="w-full justify-start hover-lift">{/* View Songs */}
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Bandas
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" className="w-full justify-start hover-lift">{/* Manage Bands */}
                  <Users className="h-4 w-4 mr-2" />
                  Meu Perfil
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
