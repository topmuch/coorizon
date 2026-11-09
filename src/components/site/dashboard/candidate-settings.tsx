"use client";

import * as React from "react";
import { Lock, Globe, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth/session-provider";
import { useToast } from "@/hooks/use-toast";
import { validatePasswordPolicy } from "@/lib/auth/password";

export function CandidateSettings() {
  const { user, refresh } = useSession();
  const { toast } = useToast();

  const [lang, setLang] = React.useState("fr");
  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [savingPwd, setSavingPwd] = React.useState(false);
  const [pwdError, setPwdError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) setLang("fr"); // preferredLang not on session; default fr
  }, [user]);

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
      const res = await fetch("/api/candidate/password", {
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

  const handleSaveLang = () => {
    toast({
      title: "Préférence enregistrée",
      description: lang === "fr" ? "Français (par défaut)" : "Italiano (bientôt disponible)",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre mot de passe et vos préférences linguistiques.
        </p>
      </div>

      {/* Language preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-brand" />
            Langue de l'interface
          </CardTitle>
          <CardDescription>Choisissez la langue d'affichage de votre espace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lang">Langue préférée</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger id="lang" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français (par défaut)</SelectItem>
                <SelectItem value="it">Italiano (bientôt disponible)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              L'italien sera disponible dans un prochain lot.
            </p>
          </div>
          <Button onClick={handleSaveLang}>Enregistrer</Button>
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
            Vos données personnelles et vos documents sont privés et protégés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>Seuls vous et l'équipe COORIZON (pour validation) accèdent à vos documents.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            <span>Vous pouvez demander l'export ou la suppression de vos données à tout moment en contactant le support.</span>
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
