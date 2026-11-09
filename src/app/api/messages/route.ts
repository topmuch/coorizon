import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, authErrorResponse } from "@/lib/auth/session";

/**
 * GET /api/messages — list the user's conversations (thread view).
 * Any authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("with"); // specific conversation partner

    if (withUserId) {
      // Get messages between current user and the specified user
      const messages = await db.message.findMany({
        where: {
          OR: [
            { senderId: userId, recipientId: withUserId },
            { senderId: withUserId, recipientId: userId },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 200,
      });
      return Response.json({ messages });
    }

    // Get all conversations (latest message per partner)
    const sent = await db.message.findMany({
      where: { senderId: userId },
      select: { recipientId: true, body: true, createdAt: true, readStatus: true },
      orderBy: { createdAt: "desc" },
    });
    const received = await db.message.findMany({
      where: { recipientId: userId },
      include: { sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Build conversation list (unique partners)
    const partners = new Map<string, { id: string; firstName: string | null; lastName: string | null; email: string; role: string; lastMessage: string; lastAt: string; unread: number }>();

    for (const m of received) {
      const existing = partners.get(m.senderId);
      const unread = m.readStatus === "Unread" ? 1 : 0;
      if (!existing || new Date(m.createdAt) > new Date(existing.lastAt)) {
        partners.set(m.senderId, {
          id: m.sender.id,
          firstName: m.sender.firstName,
          lastName: m.sender.lastName,
          email: m.sender.email,
          role: m.sender.role,
          lastMessage: m.body,
          lastAt: m.createdAt.toISOString(),
          unread: (existing?.unread ?? 0) + unread,
        });
      } else {
        existing.unread += unread;
      }
    }

    // Also check sent messages for partners not in received
    for (const m of sent) {
      if (!partners.has(m.recipientId)) {
        const partner = await db.user.findUnique({
          where: { id: m.recipientId },
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        });
        if (partner) {
          partners.set(m.recipientId, {
            ...partner,
            firstName: partner.firstName,
            lastName: partner.lastName,
            lastMessage: m.body,
            lastAt: m.createdAt.toISOString(),
            unread: 0,
          });
        }
      }
    }

    const conversations = Array.from(partners.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return Response.json({ conversations });
  } catch (e) { return authErrorResponse(e); }
}

/**
 * POST /api/messages — send a message.
 * Body: { recipientId, subject?, body }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { recipientId, subject, message } = body as { recipientId?: string; subject?: string; message?: string };

    if (!recipientId) return Response.json({ error: "Destinataire requis." }, { status: 400 });
    if (!message || !message.trim()) return Response.json({ error: "Le message ne peut pas être vide." }, { status: 400 });

    const msg = await db.message.create({
      data: {
        senderId: session.user.id,
        recipientId,
        subject: subject || null,
        body: message.trim(),
        readStatus: "Unread",
      },
    });
    return Response.json({ message: msg }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}

/**
 * PUT /api/messages — mark messages as read.
 * Body: { partnerId } — mark all messages from partnerId as read.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { partnerId } = body as { partnerId?: string };
    if (!partnerId) return Response.json({ error: "partnerId requis." }, { status: 400 });

    await db.message.updateMany({
      where: { senderId: partnerId, recipientId: session.user.id, readStatus: "Unread" },
      data: { readStatus: "Read", readAt: new Date() },
    });
    return Response.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
