import { Router, Context } from "oak";
import { ObjectId } from "mongodb";
import { mongodb } from "../db/mongo.ts";
import { COLLECTIONS, BanRuleDocument, IpLogDocument, SessionLogDocument, ChatMessageDocument, AnnouncementDocument, UserDocument, ActivePlayerDocument } from "../db/schemas.ts";
import { verifyToken } from "../auth/jwt.ts";

// Admin email is sourced from env (backend authoritative)
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")?.toLowerCase();

const adminRouter = new Router();

// Simple auth middleware: expects Bearer token, validates user email matches ADMIN_EMAIL
adminRouter.use(async (ctx: Context, next) => {
  if (!ADMIN_EMAIL) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Admin email not configured" };
    return;
  }
  const auth = ctx.request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    ctx.response.status = 401; ctx.response.body = { error: "Unauthorized" }; return;
  }
  const token = auth.substring(7);
  const payload = await verifyToken(token);
  if (!payload?.userId) { ctx.response.status = 401; ctx.response.body = { error: "Invalid token" }; return; }
  const users = mongodb.getCollection<UserDocument>(COLLECTIONS.USERS);
  const user = await users.findOne({ _id: new ObjectId(String(payload.userId)) });
  if (!user || user.email.toLowerCase() !== ADMIN_EMAIL) { ctx.response.status = 403; ctx.response.body = { error: "Forbidden" }; return; }
  (ctx.state as unknown as { adminUser: UserDocument }).adminUser = user; // store for later
  await next();
});

// Utility to parse body
async function readJson<T>(ctx: Context): Promise<T | null> {
  try { return await ctx.request.body.json(); } catch { return null; }
}

// Dashboard summary
adminRouter.get("/admin/summary", async (ctx) => {
  const users = mongodb.getCollection<UserDocument>(COLLECTIONS.USERS);
  const sessions = mongodb.getCollection<SessionLogDocument>(COLLECTIONS.SESSION_LOGS);
  const bans = mongodb.getCollection<BanRuleDocument>(COLLECTIONS.BANS);
  const chat = mongodb.getCollection<ChatMessageDocument>(COLLECTIONS.CHAT_MESSAGES);
  const activePlayersCol = mongodb.getCollection<ActivePlayerDocument>(COLLECTIONS.ACTIVE_PLAYERS);
  const [userCount, activeNow, banCount, chatCount, activePlayers] = await Promise.all([
    users.countDocuments(),
    sessions.countDocuments({ event: 'join', timestamp: { $gt: new Date(Date.now() - 1000 * 60 * 10) } }),
    bans.countDocuments({ active: true }),
    chat.countDocuments({ timestamp: { $gt: new Date(Date.now() - 1000 * 60 * 60) } }),
    activePlayersCol.countDocuments()
  ]);
  ctx.response.body = { userCount, recentJoins10m: activeNow, activeBans: banCount, recentChats1h: chatCount, activePlayers };
});
// Active players snapshot (latest positions)
adminRouter.get("/admin/active-players", async (ctx) => {
  const activePlayers = mongodb.getCollection<ActivePlayerDocument>(COLLECTIONS.ACTIVE_PLAYERS);
  const list = await activePlayers.find({}).sort({ updatedAt: -1 }).limit(500).toArray();
  ctx.response.body = { players: list };
});

// Kick (force ban-optional) by email or userId (soft action: create transient ban 1 minute if requested)
adminRouter.post('/admin/kick', async (ctx) => {
  const body = await readJson<{ email?: string; userId?: string; tempBanMinutes?: number }>(ctx);
  if (!body) { ctx.response.status = 400; ctx.response.body = { error: 'No body'}; return; }
  const users = mongodb.getCollection<UserDocument>(COLLECTIONS.USERS);
  let user: UserDocument | null = null;
  if (body.email) user = await users.findOne({ email: body.email.toLowerCase() });
  if (!user && body.userId) try { user = await users.findOne({ _id: new ObjectId(body.userId) }); } catch { /* invalid id format ignored */ }
  if (!user) { ctx.response.status = 404; ctx.response.body = { error: 'User not found'}; return; }
  if (body.tempBanMinutes) {
    const bansCol = mongodb.getCollection<BanRuleDocument>(COLLECTIONS.BANS);
    await bansCol.insertOne({ type:'email', value:user.email.toLowerCase(), createdAt:new Date(), createdBy:(ctx.state as unknown as {adminUser:UserDocument}).adminUser.email, active:true, reason:'Temp kick', expiresAt: new Date(Date.now()+ body.tempBanMinutes*60000)} as BanRuleDocument);
  }
  ctx.response.body = { success: true };
});

// List active connections (populated by websocket server via shared collection sessionLogs join events not yet left)
adminRouter.get("/admin/active-sessions", async (ctx) => {
  const sessions = mongodb.getCollection<SessionLogDocument>(COLLECTIONS.SESSION_LOGS);
  // active = last event is join and no subsequent leave; simplest: keep join events with last 5m and no matching leave after
  const since = new Date(Date.now() - 1000 * 60 * 30);
  const joinEvents = await sessions.find({ event: 'join', timestamp: { $gt: since } }).sort({ timestamp: -1 }).limit(500).toArray();
  // We'll trust ws feed for accuracy; here we just show last known position
  ctx.response.body = { sessions: joinEvents };
});

// Chat logs
adminRouter.get("/admin/chat", async (ctx) => {
  const chat = mongodb.getCollection<ChatMessageDocument>(COLLECTIONS.CHAT_MESSAGES);
  const limit = Number(ctx.request.url.searchParams.get('limit') || 200);
  const logs = await chat.find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  ctx.response.body = { messages: logs };
});

// Session logs (join/leave)
adminRouter.get("/admin/session-logs", async (ctx) => {
  const sessions = mongodb.getCollection<SessionLogDocument>(COLLECTIONS.SESSION_LOGS);
  const limit = Number(ctx.request.url.searchParams.get('limit') || 300);
  const logs = await sessions.find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  ctx.response.body = { logs };
});

// IP logs
adminRouter.get("/admin/ip-logs", async (ctx) => {
  const ipLogs = mongodb.getCollection<IpLogDocument>(COLLECTIONS.IP_LOGS);
  const limit = Number(ctx.request.url.searchParams.get('limit') || 200);
  const logs = await ipLogs.find({}).sort({ lastSeen: -1 }).limit(limit).toArray();
  ctx.response.body = { logs };
});

// List bans
adminRouter.get("/admin/bans", async (ctx) => {
  const bansCol = mongodb.getCollection<BanRuleDocument>(COLLECTIONS.BANS);
  const bans = await bansCol.find({}).sort({ createdAt: -1 }).limit(500).toArray();
  ctx.response.body = { bans };
});

// Create ban (email/internet_identity/ip) - also allows pre-emptive ban
adminRouter.post("/admin/ban", async (ctx) => {
  const data = await readJson<{ type: 'email'|'internet_identity'|'ip'; value: string; reason?: string; durationMinutes?: number }>(ctx);
  if (!data || !data.type || !data.value) { ctx.response.status = 400; ctx.response.body = { error: 'Missing fields' }; return; }
  const bansCol = mongodb.getCollection<BanRuleDocument>(COLLECTIONS.BANS);
  const existing = await bansCol.findOne({ type: data.type, value: data.value, active: true });
  if (existing) { ctx.response.status = 409; ctx.response.body = { error: 'Already banned' }; return; }
  const expiresAt = data.durationMinutes ? new Date(Date.now() + data.durationMinutes * 60000) : undefined;
  const doc: BanRuleDocument = { type: data.type, value: data.value.toLowerCase(), reason: data.reason, createdAt: new Date(), createdBy: (ctx.state as unknown as { adminUser: UserDocument }).adminUser.email, expiresAt, active: true };
  await bansCol.insertOne(doc as unknown as BanRuleDocument);
  
  // Immediately kick the banned user from active sessions via WebSocket server
  try {
    // Use Azure WebSocket server for production, localhost for development
    const wsServerUrl = Deno.env.get("DENO_ENV") === "development" 
      ? "http://localhost:8001" 
      : "https://dhaniverse-ws.azurewebsites.net";
    
    const kickPayload: { type: string; value: string; reason: string; expiresAt?: string } = {
      type: data.type,
      value: data.value,
      reason: data.reason || 'Banned by admin'
    };
    
    // Include expiration time if it's a temporary ban
    if (expiresAt) {
      kickPayload.expiresAt = expiresAt.toISOString();
    }
    
    const kickResponse = await fetch(`${wsServerUrl}/admin/ban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ctx.request.headers.get('Authorization') || ''
      },
      body: JSON.stringify(kickPayload)
    });
    
    if (kickResponse.ok) {
      const kickResult = await kickResponse.json();
      console.log(`Ban applied and ${kickResult.kicked || 0} users immediately disconnected`);
    }
  } catch (error) {
    console.error('Failed to immediately kick banned user via WebSocket:', error);
    // Don't fail the ban operation if kick fails
  }
  
  ctx.response.body = { success: true };
});

// Unban
adminRouter.post("/admin/unban", async (ctx) => {
  const data = await readJson<{ type: 'email'|'internet_identity'|'ip'; value: string }>(ctx);
  if (!data) { ctx.response.status = 400; ctx.response.body = { error: 'Missing fields' }; return; }
  const bansCol = mongodb.getCollection<BanRuleDocument>(COLLECTIONS.BANS);
  const res = await bansCol.updateMany({ type: data.type, value: data.value.toLowerCase(), active: true }, { $set: { active: false, expiresAt: new Date() } });
  ctx.response.body = { success: true, modified: res.modifiedCount };
});

// Announcements (store for audit; actual broadcast handled by ws if integrated later)
adminRouter.post("/admin/announce", async (ctx) => {
  const data = await readJson<{ message: string }>(ctx);
  if (!data?.message) { ctx.response.status = 400; ctx.response.body = { error: 'Message required' }; return; }
  const col = mongodb.getCollection<AnnouncementDocument>(COLLECTIONS.ANNOUNCEMENTS);
  await col.insertOne({ message: data.message, createdAt: new Date(), createdBy: (ctx.state as unknown as { adminUser: UserDocument }).adminUser.email } as AnnouncementDocument);
  ctx.response.body = { success: true };
});

// Check if a user/email/ip is banned
adminRouter.post("/admin/check-ban", async (ctx) => {
  const data = await readJson<{ email?: string; ip?: string; principal?: string }>(ctx);
  if (!data) { ctx.response.status = 400; ctx.response.body = { error: 'No body' }; return; }
  const bansCol = mongodb.getCollection<BanRuleDocument>(COLLECTIONS.BANS);
  const now = new Date();
  // Expire old
  await bansCol.updateMany({ active: true, expiresAt: { $lte: now } }, { $set: { active: false } });
  const matches: BanRuleDocument[] = [];
  if (data.email) {
    const b = await bansCol.find({ type: 'email', value: data.email.toLowerCase(), active: true }).toArray(); matches.push(...b);
  }
  if (data.ip) {
    const b = await bansCol.find({ type: 'ip', value: data.ip, active: true }).toArray(); matches.push(...b);
  }
  if (data.principal) {
    const b = await bansCol.find({ type: 'internet_identity', value: data.principal.toLowerCase(), active: true }).toArray(); matches.push(...b);
  }
  ctx.response.body = { banned: matches.length > 0, matches };
});

// IP Geolocation endpoint to avoid CORS issues
adminRouter.post("/admin/geolocate-ip", async (ctx) => {
  try {
    const data = await readJson<{ ip: string }>(ctx);
    if (!data?.ip) {
      ctx.response.status = 400;
      ctx.response.body = { error: 'IP address required' };
      return;
    }

    const ip = data.ip;
    
    // Skip geolocation for local/private IPs
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      ctx.response.body = {
        ip,
        country_code: 'XX',
        country_name: 'Local Network',
        region_name: 'Local',
        city_name: 'Localhost',
        latitude: 0,
        longitude: 0,
        zip_code: '00000',
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        asn: 'Local',
        as: 'Local Network',
        isp: 'Local'
      };
      return;
    }

    const API_KEY = Deno.env.get("IP_GEOLOCATION_API_KEY") || "EE3DA45AE7AB739FFED29B251A4EB9D1";
    const response = await fetch(`https://api.ip2location.io/?key=${API_KEY}&ip=${encodeURIComponent(ip)}`);
    
    if (!response.ok) {
      ctx.response.status = 500;
      ctx.response.body = { error: 'Geolocation service unavailable' };
      return;
    }

    const geoData = await response.json();
    ctx.response.body = geoData;
  } catch (error) {
    console.error('IP geolocation error:', error);
    ctx.response.status = 500;
    ctx.response.body = { error: 'Geolocation failed' };
  }
});

export default adminRouter;