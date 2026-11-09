"use client";

import * as React from "react";
import { GraduationCap, Plus, Edit, Trash2, Eye, Users, BookOpen, Award, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  level: string;
  durationHours: number | null;
  isPublished: boolean;
  trainer: { firstName: string | null; lastName: string | null } | null;
  _count: { modules: number; enrollments: number; exercises: number };
  createdAt: string;
}

export function AdminTraining() {
  const { toast } = useToast();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/training", { credentials: "include" });
      if (!res.ok) throw new Error("Échec du chargement");
      const data = await res.json();
      setCourses(data.courses || []);
    } catch {
      setError("Échec du chargement des formations.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const levelColors: Record<string, string> = {
    A1: "bg-brand/10 text-brand",
    A2: "bg-brand-green/10 text-brand-green",
    B1: "bg-navy/10 text-navy",
    B2: "bg-italian-red/10 text-italian-red",
    C1: "bg-purple-100 text-purple-700",
    C2: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy">
            <GraduationCap className="h-6 w-6 text-brand" />
            Formations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez le catalogue de formations en italien (A1 à C2).
          </p>
        </div>
        <Button onClick={() => { setEditingCourse(null); setShowAddDialog(true); }}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Nouvelle formation</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand"><BookOpen className="h-5 w-5" /></div>
          <div><div className="text-2xl font-bold text-navy">{courses.length}</div><div className="text-xs text-muted-foreground">Formations</div></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green"><Users className="h-5 w-5" /></div>
          <div><div className="text-2xl font-bold text-navy">{courses.reduce((s, c) => s + c._count.enrollments, 0)}</div><div className="text-xs text-muted-foreground">Apprenants</div></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center rounded-lg bg-navy/10 text-navy"><Award className="h-5 w-5" /></div>
          <div><div className="text-2xl font-bold text-navy">{courses.reduce((s, c) => s + c._count.exercises, 0)}</div><div className="text-xs text-muted-foreground">Examens</div></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><BookOpen className="h-5 w-5" /></div>
          <div><div className="text-2xl font-bold text-navy">{courses.reduce((s, c) => s + c._count.modules, 0)}</div><div className="text-xs text-muted-foreground">Modules</div></div>
        </CardContent></Card>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" />Réessayer</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      )}

      {/* Courses grid */}
      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <Card key={course.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge className={levelColors[course.level] || "bg-muted text-muted-foreground"}>{course.level}</Badge>
                  <Badge variant={course.isPublished ? "secondary" : "outline"}>
                    {course.isPublished ? "Publiée" : "Brouillon"}
                  </Badge>
                </div>
                <CardTitle className="text-base leading-snug">{course.title}</CardTitle>
                {course.subtitle && <CardDescription className="text-xs">{course.subtitle}</CardDescription>}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course._count.modules} modules</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course._count.enrollments} apprenants</span>
                  {course.durationHours && <span>{course.durationHours}h</span>}
                </div>
                {course.trainer && (
                  <p className="text-xs text-muted-foreground">Formateur: {course.trainer.firstName} {course.trainer.lastName}</p>
                )}
                <div className="mt-auto flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingCourse(course); setShowAddDialog(true); }}>
                    <Edit className="h-3.5 w-3.5" />Modifier
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-italian-red"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette formation ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible. Tous les modules, leçons et examens associés seront supprimés.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction className="bg-italian-red hover:bg-italian-red/90" onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/training/${course.id}`, { method: "DELETE", credentials: "include" });
                            if (!res.ok) throw new Error();
                            toast({ title: "Formation supprimée" });
                            load();
                          } catch { toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" }); }
                        }}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-navy">Aucune formation</h3>
          <p className="mt-1 text-sm text-muted-foreground">Créez votre première formation en italien.</p>
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4" />Nouvelle formation</Button>
        </CardContent></Card>
      )}

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <CourseDialog
          course={editingCourse}
          onClose={() => { setShowAddDialog(false); setEditingCourse(null); }}
          onSaved={() => { setShowAddDialog(false); setEditingCourse(null); load(); }}
        />
      )}
    </div>
  );
}

function CourseDialog({ course, onClose, onSaved }: { course: Course | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: course?.title || "",
    subtitle: course?.subtitle || "",
    description: course?.description || "",
    level: course?.level || "A1",
    durationHours: course?.durationHours?.toString() || "",
    isPublished: course?.isPublished ?? false,
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Erreur", description: "Le titre et la description sont requis.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = course ? `/api/admin/training/${course.id}` : "/api/admin/training";
      const method = course ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          description: form.description.trim(),
          level: form.level,
          durationHours: form.durationHours ? parseInt(form.durationHours) : null,
          isPublished: form.isPublished,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: course ? "Formation mise à jour" : "Formation créée" });
      onSaved();
    } catch {
      toast({ title: "Erreur", description: "Échec de l'enregistrement.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{course ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
          <DialogDescription>{course ? "Modifiez les informations de la formation." : "Créez une nouvelle formation en italien."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Italien débutant — Premiers pas" />
          </div>
          <div className="space-y-1.5">
            <Label>Sous-titre</Label>
            <Input value={form.subtitle} onChange={e => set("subtitle", e.target.value)} placeholder="Ex: Niveau A1 du CECRL" />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Description de la formation..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Niveau</Label>
              <Select value={form.level} onValueChange={v => set("level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["A1","A2","B1","B2","C1","C2"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Durée (heures)</Label>
              <Input type="number" value={form.durationHours} onChange={e => set("durationHours", e.target.value)} placeholder="60" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Publiée</Label>
            <Switch checked={form.isPublished} onCheckedChange={v => set("isPublished", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {course ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
