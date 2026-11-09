"use client";

import * as React from "react";
import { Lock, Shield, Loader2, CheckCircle2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth/session-provider";
import { useToast } from "@/hooks/use-toast";
import { validatePasswordPolicy } from "@/lib/auth/password";

export function RecruiterSettings() {
  const { user } = useSession();
  const { toast } = useToast();

  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [savingPwd, setSavingPwd] = React.useState(false);
  const [pwdError, setPwdError] = React.useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
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
      const res = await fetch("/api/recruiter/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || "Échec de la mise à jour.");
        setSavingPwd(false);
        return;
      }
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      toast({ title: "Mot de passe mis à jour", description: "Votre nouveau mot de passe est actif." });
    } catch {
      setPwdError("Une erreur est survenue. Réessayez.");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre mot de passe et consultez les informations de votre compte.
        </p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-brand" />
            Informations du compte
          </CardTitle>
          <CardDescription>Vos informations de recruteur.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nom complet</span>
            <span className="font-medium text-navy">
              {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-navy">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rôle</span>
            <span className="font-medium text-navy">Recruteur</span>
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
            Pour votre sécurité, utilisez un mot de passe d'au moins 8 caractères avec une lettre et un chiffre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwdError && (
              <Alert variant="destructive">
                <AlertDescription>{pwdError}</AlertDescription>
              </Alert>
            )}
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
            Vos données et celles de votre entreprise sont protégées.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>Vous accédez uniquement aux offres et candidatures de votre entreprise.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>Les documents des candidats sont privés et leur accès est contrôlé.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>Conforme aux obligations applicables au Sénégal et au RGPD lorsque celui-ci s'applique.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
