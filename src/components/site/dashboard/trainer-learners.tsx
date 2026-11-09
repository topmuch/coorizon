"use client";

import * as React from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Mail,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * TrainerLearners — "Apprenants" dashboard section (LOT 6 — Task 6-d).
 *
 * Lists every learner enrolled in the authenticated trainer's courses, with
 * their name, email, course, level, progress and status. A Select filter lets
 * the trainer narrow the view to a single course; a text search filters by
 * name/email.
 *
 * Data source: GET /api/trainer/learners.
 */

type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type EnrollmentStatus = "Active" | "Completed" | "Cancelled" | "Paused";

interface Learner {
  id: string;
  status: EnrollmentStatus;
  progressPct: number;
  enrolledAt: string;
  completedAt: string | null;
  candidate: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    candidateProfile: { italianLevel: CourseLevel | null } | null;
  };
  course: { id: string; title: string; level: CourseLevel };
}

interface LearnersResponse {
  learners: Learner[];
}

const STATUS_META: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  Active: {
    label: "Actif",
    className: "bg-brand-green/15 text-brand-green",
  },
  Completed: {
    label: "Terminé",
    className: "bg-brand/15 text-brand",
  },
  Cancelled: {
    label: "Annulé",
    className: "bg-muted text-muted-foreground",
  },
  Paused: {
    label: "En pause",
    className: "bg-amber-100 text-amber-700",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function fullName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full || email;
}

function initials(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  const f = (firstName?.[0] ?? "").toUpperCase();
  const l = (lastName?.[0] ?? "").toUpperCase();
  if (f || l) return `${f}${l}`;
  return email[0]?.toUpperCase() ?? "?";
}

export function TrainerLearners() {
  const [learners, setLearners] = React.useState<Learner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [courseFilter, setCourseFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/learners", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? "Impossible de charger vos apprenants."
        );
      }
      const data = (await res.json()) as LearnersResponse;
      setLearners(data.learners);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Build unique course options from the learners list.
  const courseOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    for (const l of learners) {
      if (!map.has(l.course.id)) {
        map.set(l.course.id, { id: l.course.id, title: l.course.title });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [learners]);

  // Filtered learners.
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return learners.filter((l) => {
      if (courseFilter !== "all" && l.course.id !== courseFilter) return false;
      if (!q) return true;
      const name = fullName(
        l.candidate.firstName,
        l.candidate.lastName,
        l.candidate.email
      ).toLowerCase();
      return (
        name.includes(q) || l.candidate.email.toLowerCase().includes(q)
      );
    });
  }, [learners, courseFilter, search]);

  // ---- Loading skeleton ------------------------------------------------
  if (loading && learners.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <Card className="py-5">
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Error state -----------------------------------------------------
  if (error && learners.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Impossible de charger vos apprenants</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-fit"
            onClick={() => void load()}
            aria-label="Réessayer le chargement"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Apprenants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez la progression des candidats inscrits à vos formations.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3.5 w-3.5" />
          {learners.length} inscrit{learners.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="py-4">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              className="pl-9"
              aria-label="Rechercher un apprenant"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger aria-label="Filtrer par formation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les formations</SelectItem>
                {courseOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center gap-3 text-center">
            <div
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand"
            >
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-navy">
                {learners.length === 0
                  ? "Aucun apprenant inscrit"
                  : "Aucun apprenant ne correspond à votre recherche"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {learners.length === 0
                  ? "Les inscriptions à vos formations apparaîtront ici."
                  : "Essayez de modifier votre recherche ou votre filtre."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apprenant</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Formation
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Niveau
                    </TableHead>
                    <TableHead className="min-w-[140px]">
                      Progression
                    </TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Inscrit le
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => {
                    const status = STATUS_META[l.status];
                    const name = fullName(
                      l.candidate.firstName,
                      l.candidate.lastName,
                      l.candidate.email
                    );
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span
                              aria-hidden
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand"
                            >
                              {initials(
                                l.candidate.firstName,
                                l.candidate.lastName,
                                l.candidate.email
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-navy">
                                {name}
                              </div>
                              <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {l.candidate.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm">
                              {l.course.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{l.course.level}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={l.progressPct}
                              className="h-2 w-24"
                              aria-label={`Progression : ${l.progressPct}%`}
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                              {l.progressPct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.className}>
                            {l.status === "Completed" ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : null}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatDate(l.enrolledAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
