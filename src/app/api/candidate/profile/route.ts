import { NextRequest } from "next/server";
import type { CourseLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";

/**
 * Candidate profile API (LOT 3 — Task 3-b).
 *
 * GET  /api/candidate/profile  — returns the current candidate's User fields
 *                                (firstName, lastName, email, phone) and their
 *                                CandidateProfile (or a default empty profile).
 * PUT  /api/candidate/profile  — updates User + upserts CandidateProfile,
 *                                recomputes completionPct and audits the change.
 *
 * Restricted to users with role === "Candidate".
 */

const VALID_LEVELS: CourseLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface PublicUser {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

interface PublicProfile {
  nationality: string | null;
  residenceCountry: string | null;
  city: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD
  photoUrl: string | null;
  desiredJob: string | null;
  sector: string | null;
  educationLevel: string | null;
  diplomas: string | null;
  experiences: string | null;
  skills: string | null;
  languages: string | null;
  italianLevel: CourseLevel | null;
  availability: string | null;
  geographicMobility: string | null;
  completionPct: number;
}

interface ProfileResponse {
  user: PublicUser;
  profile: PublicProfile;
}

function defaultProfile(): PublicProfile {
  return {
    nationality: null,
    residenceCountry: null,
    city: null,
    dateOfBirth: null,
    photoUrl: null,
    desiredJob: null,
    sector: null,
    educationLevel: null,
    diplomas: null,
    experiences: null,
    skills: null,
    languages: null,
    italianLevel: null,
    availability: null,
    geographicMobility: null,
    completionPct: 0,
  };
}

function isItalianLevel(value: unknown): value is CourseLevel {
  return (
    typeof value === "string" &&
    (VALID_LEVELS as string[]).includes(value)
  );
}

/** Trim and normalize a string field. Empty/whitespace → null. */
function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parse a date string (YYYY-MM-DD or ISO). Invalid → null. */
function toOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a Date as YYYY-MM-DD (UTC-safe) for the date input. */
function dateToYMD(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

/** Whether a value counts as "filled" for completion percentage. */
function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return true;
}

/**
 * GET /api/candidate/profile
 */
export async function GET(_req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    return authErrorResponse(e);
  }
  if (session.user.role !== "Candidate") {
    return Response.json(
      { error: "Accès réservé aux candidats." },
      { status: 403 }
    );
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        candidateProfile: true,
      },
    });

    if (!user) {
      return Response.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const p = user.candidateProfile;
    const profile: PublicProfile = p
      ? {
          nationality: p.nationality,
          residenceCountry: p.residenceCountry,
          city: p.city,
          dateOfBirth: p.dateOfBirth ? dateToYMD(p.dateOfBirth) : null,
          photoUrl: p.photoUrl,
          desiredJob: p.desiredJob,
          sector: p.sector,
          educationLevel: p.educationLevel,
          diplomas: p.diplomas,
          experiences: p.experiences,
          skills: p.skills,
          languages: p.languages,
          italianLevel: p.italianLevel,
          availability: p.availability,
          geographicMobility: p.geographicMobility,
          completionPct: p.completionPct,
        }
      : defaultProfile();

    const response: ProfileResponse = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      profile,
    };
    return Response.json(response);
  } catch {
    return Response.json(
      { error: "Une erreur est survenue." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/candidate/profile
 *
 * Body accepts:
 *   User fields:    firstName, lastName, phone
 *   Profile fields: nationality, residenceCountry, city, dateOfBirth (YYYY-MM-DD),
 *                   desiredJob, sector, educationLevel, diplomas, experiences,
 *                   skills, languages, italianLevel (A1–C2 or null),
 *                   availability, geographicMobility
 */
export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    return authErrorResponse(e);
  }
  if (session.user.role !== "Candidate") {
    return Response.json(
      { error: "Accès réservé aux candidats." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    // --- User fields ---
    const firstName = toOptionalString(body.firstName);
    const lastName = toOptionalString(body.lastName);
    const phone = toOptionalString(body.phone);

    // --- Italian level (strict validation) ---
    let italianLevel: CourseLevel | null = null;
    if (body.italianLevel !== undefined && body.italianLevel !== null) {
      if (!isItalianLevel(body.italianLevel)) {
        return Response.json(
          {
            error:
              "Le niveau d'italien doit être l'un de : A1, A2, B1, B2, C1, C2.",
          },
          { status: 400 }
        );
      }
      italianLevel = body.italianLevel;
    }

    // --- Date of birth (permissive: invalid → null) ---
    const dateOfBirth = toOptionalDate(body.dateOfBirth);

    // --- Profile string fields ---
    const nationality = toOptionalString(body.nationality);
    const residenceCountry = toOptionalString(body.residenceCountry);
    const city = toOptionalString(body.city);
    const desiredJob = toOptionalString(body.desiredJob);
    const sector = toOptionalString(body.sector);
    const educationLevel = toOptionalString(body.educationLevel);
    const diplomas = toOptionalString(body.diplomas);
    const experiences = toOptionalString(body.experiences);
    const skills = toOptionalString(body.skills);
    const languages = toOptionalString(body.languages);
    const availability = toOptionalString(body.availability);
    const geographicMobility = toOptionalString(body.geographicMobility);

    // --- Completion percentage (15 key fields) ---
    const profileKeyFields: unknown[] = [
      nationality,
      residenceCountry,
      city,
      dateOfBirth,
      desiredJob,
      sector,
      educationLevel,
      diplomas,
      experiences,
      skills,
      languages,
      italianLevel,
    ];
    const userKeyFields: unknown[] = [firstName, lastName, phone];
    const filledCount =
      profileKeyFields.filter(isFilled).length +
      userKeyFields.filter(isFilled).length;
    const completionPct = Math.round((filledCount / 15) * 100);

    const profileData = {
      nationality,
      residenceCountry,
      city,
      dateOfBirth,
      desiredJob,
      sector,
      educationLevel,
      diplomas,
      experiences,
      skills,
      languages,
      italianLevel,
      availability,
      geographicMobility,
      completionPct,
    };

    const result = await db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: { firstName, lastName, phone },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      const profile = await tx.candidateProfile.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, ...profileData },
        update: profileData,
      });

      return { updatedUser, profile };
    });

    await audit({
      actorId: session.user.id,
      action: "candidate.profile.update",
      targetType: "CandidateProfile",
      targetId: session.user.id,
      metadata: { completionPct },
      req,
    });

    const response: ProfileResponse = {
      user: {
        firstName: result.updatedUser.firstName,
        lastName: result.updatedUser.lastName,
        email: result.updatedUser.email,
        phone: result.updatedUser.phone,
      },
      profile: {
        nationality: result.profile.nationality,
        residenceCountry: result.profile.residenceCountry,
        city: result.profile.city,
        dateOfBirth: result.profile.dateOfBirth
          ? dateToYMD(result.profile.dateOfBirth)
          : null,
        photoUrl: result.profile.photoUrl,
        desiredJob: result.profile.desiredJob,
        sector: result.profile.sector,
        educationLevel: result.profile.educationLevel,
        diplomas: result.profile.diplomas,
        experiences: result.profile.experiences,
        skills: result.profile.skills,
        languages: result.profile.languages,
        italianLevel: result.profile.italianLevel,
        availability: result.profile.availability,
        geographicMobility: result.profile.geographicMobility,
        completionPct: result.profile.completionPct,
      },
    };
    return Response.json(response, { status: 200 });
  } catch {
    return Response.json(
      { error: "Une erreur est survenue." },
      { status: 500 }
    );
  }
}
