import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Clock, Edit, Trash } from "lucide-react";

interface SongCardProps {
  song: {
    id: string;
    name: string;
    key: string | null;
    created_at: string;
    usage_count?: number;
    last_played?: string;
  };
  onEdit?: (song: any) => void;
  onDelete?: (id: string) => void;
}

export function SongCard({ song, onEdit, onDelete }: SongCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              {song.name}
            </CardTitle>
            <div className="flex gap-2 mt-2">
              {song.key && (
                <Badge variant="secondary" className="text-xs">
                  Tom: {song.key}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {song.usage_count || 0} execuções
              </Badge>
            </div>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(song)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(song.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {song.last_played 
                ? `Última: ${new Date(song.last_played).toLocaleDateString()}`
                : `Criada: ${new Date(song.created_at).toLocaleDateString()}`
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}