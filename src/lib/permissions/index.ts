// COORIZON roles and permissions
//
// Permissions are enforced SERVER-SIDE (in API routes / server actions) and
// at the data level (queries are scoped to the user's own records). The UI
// only hides elements for convenience — hiding UI is never sufficient.

export const ROLES = {
  Candidate: "Candidate",
  Recruiter: "Recruiter",
  Trainer: "Trainer",
  RecruitmentAgent: "RecruitmentAgent",
  ImmigrationAgent: "ImmigrationAgent",
  Admin: "Admin",
  SuperAdmin: "SuperAdmin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [
  ROLES.Candidate,
  ROLES.Recruiter,
  ROLES.Trainer,
  ROLES.RecruitmentAgent,
  ROLES.ImmigrationAgent,
  ROLES.Admin,
  ROLES.SuperAdmin,
];

export const ROLE_LABELS: Record<Role, string> = {
  Candidate: "Candidat",
  Recruiter: "Recruteur",
  Trainer: "Formateur",
  RecruitmentAgent: "Agent de recrutement",
  ImmigrationAgent: "Agent d'immigration",
  Admin: "Administrateur",
  SuperAdmin: "Super administrateur",
};

/**
 * Admin-tier roles: Admin and SuperAdmin.
 * SuperAdmin has global configuration rights on top of Admin rights.
 */
export const ADMIN_ROLES: Role[] = [ROLES.Admin, ROLES.SuperAdmin];

/**
 * Agent-tier roles: RecruitmentAgent and ImmigrationAgent.
 */
export const AGENT_ROLES: Role[] = [ROLES.RecruitmentAgent, ROLES.ImmigrationAgent];

/**
 * Whether a role is an admin-tier role (Admin or SuperAdmin).
 */
export function isAdmin(role: string | undefined | null): boolean {
  return !!role && (ADMIN_ROLES as string[]).includes(role);
}

/**
 * Whether a role is the SuperAdmin (global configuration rights).
 */
export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === ROLES.SuperAdmin;
}

/**
 * Whether a role is an agent (recruitment or immigration).
 */
export function isAgent(role: string | undefined | null): boolean {
  return !!role && (AGENT_ROLES as string[]).includes(role);
}

/**
 * Check whether a role is allowed to perform a given permission.
 * This is the single source of truth for authorization.
 */
export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const r = role as Role;

  // SuperAdmin can do everything
  if (r === ROLES.SuperAdmin) return true;

  const allowed = PERMISSION_MATRIX[permission];
  if (!allowed) return false;
  return (allowed as string[]).includes(r);
}

/**
 * Granular permissions used across the platform.
 */
export const PERMISSIONS = {
  // Auth / account
  "account:read_self": "account:read_self",
  "account:update_self": "account:update_self",
  // Jobs
  "job:read_published": "job:read_published",
  "job:create": "job:create",
  "job:manage_own_company": "job:manage_own_company",
  "job:validate": "job:validate", // admin validates job offers
  // Applications
  "application:apply": "application:apply",
  "application:read_own": "application:read_own",
  "application:manage_company": "application:manage_company",
  "application:read_all": "application:read_all", // admin
  // Candidates
  "candidate:read_own_profile": "candidate:read_own_profile",
  "candidate:read_all": "candidate:read_all", // admin & agents
  "candidate:assign_agent": "candidate:assign_agent", // admin
  // Recruiter / companies
  "company:register": "company:register",
  "company:validate": "company:validate", // admin
  "company:read_all": "company:read_all",
  // Training
  "training:enroll": "training:enroll",
  "training:manage_own": "training:manage_own", // trainer
  "training:manage_all": "training:manage_all", // admin
  // Immigration
  "immigration:read_own": "immigration:read_own",
  "immigration:manage_assigned": "immigration:manage_assigned", // agent
  "immigration:read_all": "immigration:read_all", // admin
  // Admin back-office
  "admin:access": "admin:access",
  "admin:manage_users": "admin:manage_users",
  "admin:manage_roles": "admin:manage_roles",
  "admin:view_audit_logs": "admin:view_audit_logs",
  "admin:manage_cms": "admin:manage_cms",
  "admin:manage_integrations": "admin:manage_integrations",
  // Super admin only
  "super:configure": "super:configure",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role → permissions matrix.
 * SuperAdmin is handled separately (all permissions).
 */
const PERMISSION_MATRIX: Record<Permission, Role[]> = {
  "account:read_self": [ROLES.Candidate, ROLES.Recruiter, ROLES.Trainer, ROLES.RecruitmentAgent, ROLES.ImmigrationAgent, ROLES.Admin],
  "account:update_self": [ROLES.Candidate, ROLES.Recruiter, ROLES.Trainer, ROLES.RecruitmentAgent, ROLES.ImmigrationAgent, ROLES.Admin],

  "job:read_published": [ROLES.Candidate, ROLES.Recruiter, ROLES.Trainer, ROLES.Admin],
  "job:create": [ROLES.Recruiter],
  "job:manage_own_company": [ROLES.Recruiter],
  "job:validate": [ROLES.Admin],

  "application:apply": [ROLES.Candidate],
  "application:read_own": [ROLES.Candidate],
  "application:manage_company": [ROLES.Recruiter],
  "application:read_all": [ROLES.Admin],

  "candidate:read_own_profile": [ROLES.Candidate],
  "candidate:read_all": [ROLES.Admin, ROLES.RecruitmentAgent, ROLES.ImmigrationAgent],
  "candidate:assign_agent": [ROLES.Admin],

  "company:register": [ROLES.Recruiter],
  "company:validate": [ROLES.Admin],
  "company:read_all": [ROLES.Admin, ROLES.RecruitmentAgent],

  "training:enroll": [ROLES.Candidate],
  "training:manage_own": [ROLES.Trainer],
  "training:manage_all": [ROLES.Admin],

  "immigration:read_own": [ROLES.Candidate],
  "immigration:manage_assigned": [ROLES.RecruitmentAgent, ROLES.ImmigrationAgent],
  "immigration:read_all": [ROLES.Admin],

  "admin:access": [ROLES.Admin],
  "admin:manage_users": [ROLES.Admin],
  "admin:manage_roles": [ROLES.Admin],
  "admin:view_audit_logs": [ROLES.Admin],
  "admin:manage_cms": [ROLES.Admin],
  "admin:manage_integrations": [ROLES.Admin],

  "super:configure": [],
};
