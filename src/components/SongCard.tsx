import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Music, Clock, Edit, Trash, FileText, Copy, Save, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SongCardProps {
  song: {
    id: string;
    name: string;
    key: string | null;
    author: string | null;
    lyrics: string | null;
    chord_chart: string | null;
    created_at: string;
    usage_count?: number;
    last_played?: string;
    medleys?: Array<{
      event_name: string;
      event_id: string;
      medley_group: number;
      songs: Array<{
        name: string;
        key_played: string | null;
      }>;
    }>;
  };
  onEdit?: (song: any) => void;
  onDelete?: (id: string) => void;
  onLyricsUpdate?: (id: string, lyrics: string) => void;
}

export function SongCard({ song, onEdit, onDelete, onLyricsUpdate }: SongCardProps) {
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLyrics, setEditedLyrics] = useState(song.lyrics || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpenLyrics = () => {
    setEditedLyrics(song.lyrics || "");
    setIsEditing(false);
    setLyricsOpen(true);
  };

  const handleSaveLyrics = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("songs")
      .update({ lyrics: editedLyrics })
      .eq("id", song.id);
    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar a letra.", variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Letra atualizada com sucesso." });
      song.lyrics = editedLyrics;
      onLyricsUpdate?.(song.id, editedLyrics);
      setIsEditing(false);
    }
  };

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
        {song.author && (
          <p className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">Autor:</span> {song.author}
          </p>
        )}

        {song.chord_chart && (
          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Cifra:</p>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">
              {song.chord_chart}
            </pre>
          </div>
        )}

        {song.medleys && song.medleys.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Medleys:</p>
            <div className="space-y-2">
              {song.medleys.map((medley, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex flex-wrap gap-1">
                    {medley.songs.map((medleySong, songIdx) => (
                      <Badge key={songIdx} variant="outline" className="text-xs">
                        {medleySong.name} {medleySong.key_played && `(${medleySong.key_played})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          {song.lyrics && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={handleOpenLyrics}
            >
              <FileText className="h-3 w-3" />
              Letra
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={lyricsOpen} onOpenChange={setLyricsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Letra - {song.name}
            </DialogTitle>
          </DialogHeader>

          {isEditing ? (
            <Textarea
              value={editedLyrics}
              onChange={(e) => setEditedLyrics(e.target.value)}
              className="flex-1 min-h-[200px] max-h-[50vh] font-mono text-sm"
            />
          ) : (
            <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground border rounded-md p-4 bg-muted/30">
              {editedLyrics || song.lyrics}
            </div>
          )}

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditedLyrics(song.lyrics || "");
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveLyrics}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(song.lyrics || "");
                    toast({ title: "Copiado!", description: "Letra copiada para a área de transferência." });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
