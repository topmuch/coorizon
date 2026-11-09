"use client";

import * as React from "react";
import {
  Users,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Building2,
  GraduationCap,
  Briefcase,
  FileText,
  Send,
  Plane,
  CreditCard,
  MessageSquare,
  Bell,
  Award,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth/session-provider";
import { ROLE_LABELS, ROLES, ALL_ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

// ─── Types ─────────────────────────────────────────────────────────────────

type UserStatus = "Active" | "Pending" | "Suspended" | "Deactivated";

interface UserListItem {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  candidateProfile: { id: string } | null;
  recruiterProfile: {
    id: string;
    company: { legalName: string } | null;
  } | null;
}

interface UsersListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserDetail {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerified: string | null;
  preferredLang: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  candidateProfile: {
    id: string;
    nationality: string | null;
    residenceCountry: string | null;
    city: string | null;
    desiredJob: string | null;
    sector: string | null;
    italianLevel: string | null;
    completionPct: number;
  } | null;
  recruiterProfile: {
    id: string;
    jobTitle: string | null;
    responsibleName: string | null;
    company: {
      id: string;
      legalName: string;
      status: string;
      city: string | null;
      sector: string | null;
    } | null;
  } | null;
  trainerProfile: {
    id: string;
    bio: string | null;
    specialties: string | null;
    isActive: boolean;
  } | null;
  _count: Record<string, number>;
}

interface AuditTrailEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

interface UserDetailResponse {
  user: UserDetail;
  counts: Record<string, number>;
  auditTrail: AuditTrailEntry[];
}

// ─── Display metadata ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<UserStatus, string> = {
  Active: "Actif",
  Pending: "En attente",
  Suspended: "Suspendu",
  Deactivated: "Désactivé",
};

const COMPANY_STATUS_LABELS: Record<string, string> = {
  Pending: "En attente de validation",
  Validated: "Validée",
  Suspended: "Suspendue",
  Rejected: "Rejetée",
};

function statusBadgeClass(status: UserStatus): string {
  switch (status) {
    case "Active":
      return "bg-brand-green/10 text-brand-green border border-brand-green/30";
    case "Pending":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "Suspended":
      return "bg-italian-red/10 text-italian-red border border-italian-red/30";
    case "Deactivated":
      return "bg-muted text-muted-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function roleBadgeClass(role: Role): string {
  switch (role) {
    case "Candidate":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Recruiter":
      return "bg-brand-green/10 text-brand-green border border-brand-green/30";
    case "Trainer":
      return "bg-purple-50 text-purple-700 border border-purple-200";
    case "RecruitmentAgent":
    case "ImmigrationAgent":
      return "bg-navy/10 text-navy border border-navy/30";
    case "Admin":
      return "bg-italian-red/10 text-italian-red border border-italian-red/30";
    case "SuperAdmin":
      return "bg-navy text-white border border-navy font-semibold";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function roleIcon(role: Role): React.ComponentType<{ className?: string }> | null {
  switch (role) {
    case "Candidate":
      return Users;
    case "Recruiter":
      return Building2;
    case "Trainer":
      return GraduationCap;
    case "RecruitmentAgent":
    case "ImmigrationAgent":
      return Plane;
    case "Admin":
    case "SuperAdmin":
      return Shield;
    default:
      return null;
  }
}

// ─── Date helpers ──────────────────────────────────────────────────────────

function formatDateFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function fullName(user: { firstName: string | null; lastName: string | null; email: string }): string {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name.length > 0 ? name : user.email;
}

function initials(user: { firstName: string | null; lastName: string | null; email: string }): string {
  const fi = user.firstName?.[0] ?? "";
  const li = user.lastName?.[0] ?? "";
  if (fi || li) return (fi + li).toUpperCase();
  return user.email[0]?.toUpperCase() ?? "?";
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusBadgeClass(status))}>
      <span
        className={cn(
          "mr-1 inline-block size-1.5 rounded-full",
          status === "Active"
            ? "bg-brand-green"
            : status === "Pending"
            ? "bg-amber-500"
            : status === "Suspended"
            ? "bg-italian-red"
            : "bg-muted-foreground"
        )}
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const icon = roleIcon(role);
  return (
    <Badge variant="outline" className={cn("font-medium", roleBadgeClass(role))}>
      {icon ? React.createElement(icon, { className: "size-3" }) : null}
      {ROLE_LABELS[role]}
    </Badge>
  );
}

function AvatarInitials({ user }: { user: { firstName: string | null; lastName: string | null; email: string } }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
      {initials(user)}
    </div>
  );
}

// ─── Stat tile (used in detail dialog) ─────────────────────────────────────

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
}

function StatTile({ icon: Icon, label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function AdminUsers() {
  const { toast } = useToast();
  const { user: sessionUser } = useSession();
  const isSuperAdmin = sessionUser?.role === ROLES.SuperAdmin;

  // List state
  const [users, setUsers] = React.useState<UserListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);

  // Filters
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");

  // Action state
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  // Detail dialog
  const [detailUserId, setDetailUserId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<UserDetail | null>(null);
  const [detailCounts, setDetailCounts] = React.useState<Record<string, number> | null>(null);
  const [detailAuditTrail, setDetailAuditTrail] = React.useState<AuditTrailEntry[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Suspend confirmation
  const [suspendUserId, setSuspendUserId] = React.useState<string | null>(null);
  const suspendTarget = React.useMemo(
    () => users.find((u) => u.id === suspendUserId) ?? null,
    [users, suspendUserId]
  );

  // Change role dialog
  const [changeRoleUserId, setChangeRoleUserId] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<string>("");
  const changeRoleTarget = React.useMemo(
    () => users.find((u) => u.id === changeRoleUserId) ?? null,
    [users, changeRoleUserId]
  );

  // ─── Fetch list ───────────────────────────────────────────────────────
  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (roleFilter !== "all") qs.set("role", roleFilter);
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (appliedSearch.trim()) qs.set("q", appliedSearch.trim());
      qs.set("page", String(page));
      qs.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/users?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec du chargement des utilisateurs.");
      }
      const data = (await res.json()) as UsersListResponse;
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, appliedSearch, page]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change.
  React.useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, appliedSearch]);

  // ─── Fetch detail ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!detailUserId) {
      setDetail(null);
      setDetailCounts(null);
      setDetailAuditTrail([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetail(null);
      setDetailCounts(null);
      setDetailAuditTrail([]);
      try {
        const res = await fetch(`/api/admin/users/${detailUserId}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Utilisateur introuvable.");
        }
        const data = (await res.json()) as UserDetailResponse;
        if (!cancelled) {
          setDetail(data.user);
          setDetailCounts(data.counts);
          setDetailAuditTrail(data.auditTrail);
        }
      } catch (e) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: e instanceof Error ? e.message : "Une erreur est survenue.",
          });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailUserId, toast]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const runUpdate = async (
    userId: string,
    payload: { status?: UserStatus; role?: Role },
    successTitle: string,
    successDesc: string
  ): Promise<boolean> => {
    setPendingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Échec de la mise à jour.");
      }
      toast({ title: successTitle, description: successDesc });
      await fetchUsers();
      return true;
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      });
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendUserId) return;
    const ok = await runUpdate(
      suspendUserId,
      { status: "Suspended" },
      "Utilisateur suspendu",
      "L'utilisateur a été suspendu et ne peut plus se connecter."
    );
    if (ok) setSuspendUserId(null);
  };

  const handleReactivate = async (userId: string) => {
    await runUpdate(
      userId,
      { status: "Active" },
      "Utilisateur réactivé",
      "Le compte est à nouveau actif."
    );
  };

  const handleChangeRole = async () => {
    if (!changeRoleUserId || !selectedRole) return;
    const ok = await runUpdate(
      changeRoleUserId,
      { role: selectedRole as Role },
      "Rôle mis à jour",
      `Le rôle a été modifié en « ${ROLE_LABELS[selectedRole as Role]} ».`
    );
    if (ok) {
      setChangeRoleUserId(null);
      setSelectedRole("");
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  // ─── Render helpers ───────────────────────────────────────────────────

  const canSuspend = (u: UserListItem): boolean => {
    if (u.role === ROLES.SuperAdmin) return false;
    if (sessionUser && u.id === sessionUser.id) return false;
    return u.status === "Active";
  };

  const canReactivate = (u: UserListItem): boolean => {
    return u.status === "Suspended" || u.status === "Pending" || u.status === "Deactivated";
  };

  const canChangeRole = (u: UserListItem): boolean => {
    if (!isSuperAdmin) return false;
    if (u.role === ROLES.SuperAdmin) return false;
    if (sessionUser && u.id === sessionUser.id) return false;
    return true;
  };

  const openDetails = (userId: string) => setDetailUserId(userId);
  const openSuspend = (userId: string) => setSuspendUserId(userId);
  const openChangeRole = (userId: string, currentRole: Role) => {
    setChangeRoleUserId(userId);
    setSelectedRole(currentRole);
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-6 text-navy" />
          <h1 className="text-2xl font-bold text-ink">Gestion des utilisateurs</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Consultez, recherchez et administrez l'ensemble des comptes de la plateforme.
          Les super administrateurs ne peuvent pas être suspendus.
        </p>
      </header>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="filter-role" className="text-xs text-muted-foreground">
                Rôle
              </Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="filter-role" className="w-full">
                  <SelectValue placeholder="Tous les rôles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs text-muted-foreground">
                Statut
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="filter-status" className="w-full">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="Active">Actif</SelectItem>
                  <SelectItem value="Pending">En attente</SelectItem>
                  <SelectItem value="Suspended">Suspendu</SelectItem>
                  <SelectItem value="Deactivated">Désactivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-search" className="text-xs text-muted-foreground">
                Recherche
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  className="pl-9"
                  placeholder="Nom, prénom ou email"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setAppliedSearch(searchInput.trim());
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setAppliedSearch(searchInput.trim())}
              >
                <Search className="size-4" />
                Rechercher
              </Button>
              <Button
                variant="outline"
                aria-label="Réinitialiser les filtres"
                onClick={() => {
                  setRoleFilter("all");
                  setStatusFilter("all");
                  setSearchInput("");
                  setAppliedSearch("");
                }}
              >
                <RefreshCw className="size-4" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchUsers}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="size-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && users.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-ink">Aucun utilisateur trouvé</p>
            <p className="text-xs text-muted-foreground">
              Modifiez vos filtres ou réessayez avec une autre recherche.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results — desktop table */}
      {!loading && !error && users.length > 0 && (
        <>
          <Card className="hidden lg:block">
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials user={u} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-ink">
                              {fullName(u)}
                            </div>
                            {u.recruiterProfile?.company?.legalName && (
                              <div className="truncate text-xs text-muted-foreground">
                                {u.recruiterProfile.company.legalName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateFr(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.lastLoginAt ? formatDateTimeFr(u.lastLoginAt) : "Jamais"}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActionsMenu
                          user={u}
                          canSuspend={canSuspend(u)}
                          canReactivate={canReactivate(u)}
                          canChangeRole={canChangeRole(u)}
                          pending={pendingId === u.id}
                          onDetails={() => openDetails(u.id)}
                          onSuspend={() => openSuspend(u.id)}
                          onReactivate={() => handleReactivate(u.id)}
                          onChangeRole={() => openChangeRole(u.id, u.role)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Results — mobile cards */}
          <div className="space-y-3 lg:hidden">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="pt-0">
                  <div className="flex items-start gap-3">
                    <AvatarInitials user={u} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">
                            {fullName(u)}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </div>
                          {u.recruiterProfile?.company?.legalName && (
                            <div className="truncate text-xs text-muted-foreground">
                              {u.recruiterProfile.company.legalName}
                            </div>
                          )}
                        </div>
                        <UserActionsMenu
                          user={u}
                          canSuspend={canSuspend(u)}
                          canReactivate={canReactivate(u)}
                          canChangeRole={canChangeRole(u)}
                          pending={pendingId === u.id}
                          onDetails={() => openDetails(u.id)}
                          onSuspend={() => openSuspend(u.id)}
                          onReactivate={() => handleReactivate(u.id)}
                          onChangeRole={() => openChangeRole(u.id, u.role)}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <RoleBadge role={u.role} />
                        <StatusBadge status={u.status} />
                      </div>

                      <Separator className="my-3" />

                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Inscrit le</dt>
                          <dd className="font-medium text-ink">
                            {formatDateFr(u.createdAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Dernière connexion</dt>
                          <dd className="font-medium text-ink">
                            {u.lastLoginAt ? formatDateFr(u.lastLoginAt) : "Jamais"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              {total > 0
                ? `Affichage de ${pageStart}–${pageEnd} sur ${total} utilisateur(s)`
                : "Aucun utilisateur"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Précédent
              </Button>
              <span className="text-xs text-muted-foreground">
                Page <span className="font-semibold text-ink">{page}</span> / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ─── Details dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!detailUserId} onOpenChange={(o) => !o && setDetailUserId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-navy" />
              Détails de l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Informations complètes, activités associées et journal d'audit récent.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {/* Identity */}
              <section className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <AvatarInitials user={detail} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">{fullName(detail)}</h3>
                      <RoleBadge role={detail.role} />
                      <StatusBadge status={detail.status} />
                    </div>
                    <div className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="size-4" />
                        <span className="truncate text-ink">{detail.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-4" />
                        <span className="text-ink">{detail.phone ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-4" />
                        <span className="text-ink">
                          Inscrit le {formatDateFr(detail.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserCheck className="size-4" />
                        <span className="text-ink">
                          Dernière connexion :{" "}
                          {detail.lastLoginAt ? formatDateTimeFr(detail.lastLoginAt) : "Jamais"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Profile-specific */}
              {detail.candidateProfile && (
                <section className="rounded-lg border border-border p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <Users className="size-4 text-brand" />
                    Profil candidat
                  </h4>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <Field label="Poste recherché" value={detail.candidateProfile.desiredJob} />
                    <Field label="Secteur" value={detail.candidateProfile.sector} />
                    <Field label="Ville" value={detail.candidateProfile.city} />
                    <Field label="Nationalité" value={detail.candidateProfile.nationality} />
                    <Field
                      label="Pays de résidence"
                      value={detail.candidateProfile.residenceCountry}
                    />
                    <Field
                      label="Niveau d'italien"
                      value={detail.candidateProfile.italianLevel ?? "—"}
                    />
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Profil complété</span>
                      <span className="font-semibold text-ink">
                        {detail.candidateProfile.completionPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${detail.candidateProfile.completionPct}%` }}
                      />
                    </div>
                  </div>
                </section>
              )}

              {detail.recruiterProfile && (
                <section className="rounded-lg border border-border p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <Building2 className="size-4 text-brand" />
                    Profil recruteur
                  </h4>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <Field
                      label="Entreprise"
                      value={detail.recruiterProfile.company?.legalName ?? "—"}
                    />
                    <Field
                      label="Statut entreprise"
                      value={
                        detail.recruiterProfile.company
                          ? COMPANY_STATUS_LABELS[detail.recruiterProfile.company.status] ??
                            detail.recruiterProfile.company.status
                          : "—"
                      }
                    />
                    <Field
                      label="Fonction"
                      value={detail.recruiterProfile.jobTitle ?? "—"}
                    />
                    <Field
                      label="Responsable"
                      value={detail.recruiterProfile.responsibleName ?? "—"}
                    />
                  </div>
                </section>
              )}

              {detail.trainerProfile && (
                <section className="rounded-lg border border-border p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <GraduationCap className="size-4 text-brand" />
                    Profil formateur
                  </h4>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <Field
                      label="Spécialités"
                      value={detail.trainerProfile.specialties ?? "—"}
                    />
                    <Field
                      label="Statut"
                      value={detail.trainerProfile.isActive ? "Actif" : "Inactif"}
                    />
                  </div>
                  {detail.trainerProfile.bio && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {detail.trainerProfile.bio}
                    </p>
                  )}
                </section>
              )}

              {/* Counts */}
              {detailCounts && (
                <section>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <ClipboardList className="size-4 text-navy" />
                    Activités associées
                  </h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <StatTile
                      icon={Send}
                      label="Candidatures"
                      value={detailCounts.applications ?? 0}
                    />
                    <StatTile
                      icon={FileText}
                      label="Documents"
                      value={detailCounts.candidateDocuments ?? 0}
                    />
                    <StatTile
                      icon={GraduationCap}
                      label="Inscriptions"
                      value={detailCounts.enrollments ?? 0}
                    />
                    <StatTile
                      icon={Award}
                      label="Certificats"
                      value={detailCounts.certificates ?? 0}
                    />
                    <StatTile
                      icon={Briefcase}
                      label="Offres créées"
                      value={detailCounts.jobOffers ?? 0}
                    />
                    <StatTile
                      icon={Users}
                      label="Entretiens (recruteur)"
                      value={detailCounts.interviewsAsRecruiter ?? 0}
                    />
                    <StatTile
                      icon={Plane}
                      label="Dossiers immigration"
                      value={
                        (detailCounts.immigrationCasesAsAgent ?? 0) +
                        (detailCounts.immigrationCasesAsCandidate ?? 0)
                      }
                    />
                    <StatTile
                      icon={CreditCard}
                      label="Paiements"
                      value={detailCounts.payments ?? 0}
                    />
                    <StatTile
                      icon={MessageSquare}
                      label="Messages envoyés"
                      value={detailCounts.messagesSent ?? 0}
                    />
                    <StatTile
                      icon={Bell}
                      label="Notifications"
                      value={detailCounts.notifications ?? 0}
                    />
                    <StatTile
                      icon={GraduationCap}
                      label="Cours créés"
                      value={detailCounts.coursesCreated ?? 0}
                    />
                    <StatTile
                      icon={FileText}
                      label="Examens passés"
                      value={detailCounts.examAttempts ?? 0}
                    />
                  </div>
                </section>
              )}

              {/* Audit trail */}
              {detailAuditTrail.length > 0 && (
                <section>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldAlert className="size-4 text-italian-red" />
                    Journal d'audit récent
                  </h4>
                  <ul className="max-h-72 space-y-2 overflow-y-auto custom-scrollbar rounded-lg border border-border bg-surface p-3">
                    {detailAuditTrail.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-3 border-b border-border pb-2 text-sm last:border-b-0 last:pb-0"
                      >
                        <div className="mt-0.5 size-2 shrink-0 rounded-full bg-navy/50" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <code className="rounded bg-card px-1.5 py-0.5 text-xs font-medium text-ink">
                              {entry.action}
                            </code>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTimeFr(entry.createdAt)}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {entry.actor
                              ? `par ${fullName(entry.actor)}`
                              : "Système"}
                            {entry.ipAddress && ` · IP ${entry.ipAddress}`}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucune donnée disponible.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailUserId(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Suspend confirmation ─────────────────────────────────────────── */}
      <AlertDialog
        open={!!suspendUserId}
        onOpenChange={(o) => !o && setSuspendUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget ? (
                <>
                  Vous êtes sur le point de suspendre{" "}
                  <span className="font-semibold text-ink">{fullName(suspendTarget)}</span>.
                  L'utilisateur ne pourra plus se connecter à la plateforme tant que son
                  compte restera suspendu. Cette action peut être annulée à tout moment
                  via « Réactiver ».
                </>
              ) : (
                "Cette action suspendra l'utilisateur sélectionné."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingId === suspendUserId}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pendingId === suspendUserId}
              onClick={(e) => {
                e.preventDefault();
                void handleSuspend();
              }}
              className="bg-italian-red text-white hover:bg-italian-red/90"
            >
              {pendingId === suspendUserId ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Suspension…
                </>
              ) : (
                <>
                  <UserX className="size-4" />
                  Suspendre
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Change role dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!changeRoleUserId}
        onOpenChange={(o) => {
          if (!o) {
            setChangeRoleUserId(null);
            setSelectedRole("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-navy" />
              Changer le rôle
            </DialogTitle>
            <DialogDescription>
              {changeRoleTarget ? (
                <>
                  Modifiez le rôle de{" "}
                  <span className="font-semibold text-ink">
                    {fullName(changeRoleTarget)}
                  </span>
                  . Cette opération est réservée au super administrateur et sera
                  consignée dans le journal d'audit.
                </>
              ) : (
                "Sélectionnez un nouveau rôle pour cet utilisateur."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="role-select" className="text-xs text-muted-foreground">
              Nouveau rôle
            </Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.filter((r) => r !== ROLES.SuperAdmin).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {changeRoleTarget && selectedRole === changeRoleTarget.role && (
              <p className="text-xs text-muted-foreground">
                Ce rôle est déjà attribué à l'utilisateur.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangeRoleUserId(null);
                setSelectedRole("");
              }}
              disabled={pendingId === changeRoleUserId}
            >
              Annuler
            </Button>
            <Button
              disabled={
                pendingId === changeRoleUserId ||
                !selectedRole ||
                (!!changeRoleTarget && selectedRole === changeRoleTarget.role)
              }
              onClick={() => void handleChangeRole()}
            >
              {pendingId === changeRoleUserId ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Confirmer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Field helper ──────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-ink">{value ?? "—"}</dd>
    </div>
  );
}

// ─── Per-user actions menu ─────────────────────────────────────────────────

interface UserActionsMenuProps {
  user: UserListItem;
  canSuspend: boolean;
  canReactivate: boolean;
  canChangeRole: boolean;
  pending: boolean;
  onDetails: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onChangeRole: () => void;
}

function UserActionsMenu({
  user,
  canSuspend,
  canReactivate,
  canChangeRole,
  pending,
  onDetails,
  onSuspend,
  onReactivate,
  onChangeRole,
}: UserActionsMenuProps) {
  const isSuperAdmin = user.role === ROLES.SuperAdmin;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions pour ${fullName(user)}`}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreVertical className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={onDetails}>
          <Eye className="size-4" />
          Voir détails
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onSuspend}
          disabled={!canSuspend}
          className="text-italian-red focus:text-italian-red"
        >
          <UserX className="size-4" />
          Suspendre
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onReactivate}
          disabled={!canReactivate}
        >
          <UserCheck className="size-4" />
          Réactiver
        </DropdownMenuItem>
        {canChangeRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onChangeRole}>
              <Shield className="size-4" />
              Changer le rôle
            </DropdownMenuItem>
          </>
        )}
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
              Les super administrateurs ne peuvent pas être suspendus.
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
