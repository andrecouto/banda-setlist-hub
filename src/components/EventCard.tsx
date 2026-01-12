import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Music, Youtube, Edit, Trash, Eye, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type EventType = 'culto_domingo' | 'culto_quarta' | 'especial';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    event_date: string;
    event_type?: EventType;
    notes: string | null;
    youtube_link: string | null;
    lyrics?: string | null;
    bands: { name: string };
    profiles: { name: string } | null;
    songs?: { name: string; key_played: string | null }[];
  };
  onEdit?: (event: any) => void;
  onDelete?: (id: string) => void;
  canManage?: boolean;
}

export function EventCard({ event, onEdit, onDelete, canManage = false }: EventCardProps) {
  const eventDate = new Date(event.event_date + 'T00:00:00');
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();
  const { toast } = useToast();

  // Prepara a URL do WhatsApp fora do handler para evitar bloqueios/iframe
  const formattedDate = eventDate.toLocaleDateString('pt-BR', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  let message = `🎵 *${event.name}*\n`;
  message += `📅 ${formattedDate}\n`;
  message += `🎸 Banda: ${event.bands.name}\n`;
  
  if (event.songs && event.songs.length > 0) {
    message += `\n*Músicas do Setlist:*\n`;
    event.songs.forEach((song, index) => {
      message += `${index + 1}. ${song.name}`;
      if (song.key_played) {
        message += ` (${song.key_played})`;
      }
      message += '\n';
    });
  }
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const whatsappUrlAlt = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  const handleShareClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
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
      await navigator.clipboard.writeText(message);
      toast({ title: "Mensagem copiada", description: "Abra o WhatsApp e cole a mensagem." });
      e.preventDefault();
    } catch {}
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {event.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {eventDate.toLocaleDateString('pt-BR', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </CardDescription>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {event.bands.name}
              </Badge>
              {event.profiles && (
                <Badge variant="secondary" className="text-xs">
                  Líder: {event.profiles.name}
                </Badge>
              )}
              {event.event_type === 'especial' && (
                <Badge variant="destructive" className="text-xs bg-amber-500 hover:bg-amber-600">
                  Especial
                </Badge>
              )}
              {isUpcoming && (
                <Badge variant="default" className="text-xs">
                  Próximo
                </Badge>
              )}
              {isPast && (
                <Badge variant="outline" className="text-xs">
                  Realizado
                </Badge>
              )}
              {event.youtube_link && (
                <Badge variant="destructive" className="text-xs">
                  <Youtube className="h-3 w-3 mr-1" />
                  YouTube
                </Badge>
              )}
            </div>
          </div>
          {canManage && (onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(event)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(event.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {event.notes && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {event.notes}
          </p>
        )}
        
        {event.songs && event.songs.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Músicas tocadas ({event.songs.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {event.songs.slice(0, 3).map((song, index) => (
                <div key={index} className="flex justify-between items-center text-xs bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">
                    {index + 1}. {song.name}
                  </span>
                  {song.key_played && (
                    <Badge variant="outline" className="text-xs py-0 px-1">
                      {song.key_played}
                    </Badge>
                  )}
                </div>
              ))}
              {event.songs.length > 3 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{event.songs.length - 3} músicas...
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {isUpcoming 
              ? `Em ${Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias`
              : `Há ${Math.floor((new Date().getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))} dias`
            }
          </div>
          <div className="flex gap-2">
            {event.lyrics && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(event.lyrics || "");
                  toast({
                    title: "Copiado!",
                    description: "Letra copiada para a área de transferência.",
                  });
                }}
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Letras</span>
              </Button>
            )}
            <Link to={`/events/${event.id}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Ver Detalhes
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}