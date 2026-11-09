"use client";

import * as React from "react";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Settings,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth/session-provider";
import { useToast } from "@/hooks/use-toast";
import { validatePasswordPolicy } from "@/lib/auth/password";
import { ROLE_LABELS } from "@/lib/permissions";

/**
 * TrainerSettings — "Paramètres" dashboard section (LOT 6 — Task 6-d).
 *
 * Three blocks:
 *   1. Account info (name, email, role) — read-only.
 *   2. Change password form — PUT /api/trainer/password.
 *   3. Privacy & data card.
 */

export function TrainerSettings() {
  const { user } = useSession();
  const { toast } = useToast();

  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [savingPwd, setSavingPwd] = React.useState(false);
  const [pwdError, setPwdError] = React.useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = React.useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError("Veuillez renseigner tous les champs.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    const policyErr = validatePasswordPolicy(newPwd);
    if (policyErr) {
      setPwdError(policyErr);
      return;
    }

    setSavingPwd(true);
    try {
      const res = await fetch("/api/trainer/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: currentPwd,
          newPassword: newPwd,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;
      if (!res.ok) {
        setPwdError(
          data?.error ?? "Échec de la mise à jour du mot de passe."
        );
        return;
      }
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setPwdSuccess(true);
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre nouveau mot de passe est actif.",
      });
    } catch {
      setPwdError("Une erreur est survenue. Réessayez.");
    } finally {
      setSavingPwd(false);
    }
  };

  const roleLabel = user
    ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role
    : "";

  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre compte formateur et votre mot de passe.
        </p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-brand" />
            Informations du compte
          </CardTitle>
          <CardDescription>
            Vos informations de formateur COORIZON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Nom complet</Label>
              <Input
                id="account-name"
                value={displayName}
                readOnly
                aria-readonly="true"
                className="bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                value={user?.email ?? ""}
                readOnly
                aria-readonly="true"
                className="bg-surface"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-role">Rôle</Label>
            <div className="flex items-center gap-2">
              <Badge className="bg-brand/10 text-brand">{roleLabel}</Badge>
              {user?.status ? (
                <Badge variant="outline">{user.status}</Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Votre rôle est attribué par l&apos;administration. Pour le
              modifier, contactez l&apos;équipe COORIZON.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-brand" />
            Changer mon mot de passe
          </CardTitle>
          <CardDescription>
            Pour votre sécurité, utilisez un mot de passe d&apos;au moins 8
            caractères avec une lettre et un chiffre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwdError ? (
              <Alert variant="destructive">
                <AlertDescription>{pwdError}</AlertDescription>
              </Alert>
            ) : null}
            {pwdSuccess ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-brand-green" />
                <AlertDescription>
                  Votre mot de passe a été mis à jour avec succès.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="current-pwd">Mot de passe actuel</Label>
              <Input
                id="current-pwd"
                type="password"
                autoComplete="current-password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
                <Input
                  id="new-pwd"
                  type="password"
                  autoComplete="new-password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pwd">Confirmer le nouveau</Label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={savingPwd}>
              {savingPwd ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour…
                </>
              ) : (
                "Mettre à jour le mot de passe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Privacy & data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-brand-green" />
            Confidentialité et données
          </CardTitle>
          <CardDescription>
            Le contenu pédagogique et les données de vos apprenants sont
            protégés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>
              Vous seul gérez les formations qui vous sont assignées. Les
              autres formateurs n&apos;ont pas accès à vos cours.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>
              Les résultats et tentatives de vos apprenants sont consultables
              par vous et par l&apos;équipe COORIZON à des fins de suivi.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>
              Conforme aux obligations applicables au Sénégal et au RGPD
              lorsque celui-ci s&apos;applique.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
