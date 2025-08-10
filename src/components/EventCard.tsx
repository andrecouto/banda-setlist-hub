import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Music, Youtube, Edit, Trash, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    event_date: string;
    notes: string | null;
    youtube_link: string | null;
    bands: { name: string };
    profiles: { name: string } | null;
  };
  onEdit?: (event: any) => void;
  onDelete?: (id: string) => void;
  canManage?: boolean;
}

export function EventCard({ event, onEdit, onDelete, canManage = false }: EventCardProps) {
  const eventDate = new Date(event.event_date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();
  
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
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {isUpcoming 
              ? `Em ${Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias`
              : `Há ${Math.floor((new Date().getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))} dias`
            }
          </div>
          <Link to={`/events/${event.id}`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Ver Detalhes
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}