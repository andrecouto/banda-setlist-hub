import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Music, Edit, Trash } from "lucide-react";
import { Link } from "react-router-dom";

interface BandCardProps {
  band: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    member_count?: number;
    event_count?: number;
    song_count?: number;
  };
  onEdit: (band: any) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}

export function BandCard({ band, onEdit, onDelete, canManage }: BandCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{band.name}</CardTitle>
            <CardDescription className="mt-1">
              {band.description || "Sem descrição"}
            </CardDescription>
          </div>
          {canManage && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(band)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(band.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{band.member_count || 0} membros</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{band.event_count || 0} eventos</span>
          </div>
          <div className="flex items-center gap-1">
            <Music className="h-4 w-4" />
            <span>{band.song_count || 0} músicas</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <Badge variant="secondary">
            Criada em {new Date(band.created_at).toLocaleDateString()}
          </Badge>
          <Link to={`/bands/${band.id}`}>
            <Button variant="outline" size="sm">
              Ver Detalhes
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}