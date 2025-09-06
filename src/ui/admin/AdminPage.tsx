import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { 
    Users, Shield, MessageSquare, Activity, Ban, 
    Hammer, Search, Filter, RefreshCw, Eye, 
    MapPin, Clock, AlertTriangle, CheckCircle,
    X, Play, Pause, Volume2, VolumeX, Settings,
    UserX, Zap, Globe, Monitor, Database
} from "lucide-react";

// ---------------- Types ------------------
interface BanEntry {
    _id?: string;
    type: string;
    value: string;
    reason?: string;
    active: boolean;
    createdAt: string;
    expiresAt?: string;
    createdBy?: string;
}
interface ChatLog {
    _id?: string;
    username?: string;
    message: string;
    timestamp: string;
    userId?: string;
}
interface SessionLog {
    _id?: string;
    userId?: string;
    username?: string;
    email?: string;
    ip?: string;
    event: string;
    timestamp: string;
    skin?: string;
    position?: { x: number; y: number };
}
interface IpLog {
    _id?: string;
    userId?: string;
    email?: string;
    ip: string;
    firstSeen: string;
    lastSeen: string;
    count: number;
}
interface IpGeolocation {
    ip: string;
    country_code: string;
    country_name: string;
    region_name: string;
    city_name: string;
    latitude: number;
    longitude: number;
    zip_code: string;
    time_zone: string;
    asn: string;
    as: string;
    is_proxy: boolean;
}
interface LivePlayer {
    connectionId: string;
    userId?: string;
    username?: string;
    email?: string;
    x: number;
    y: number;
    animation?: string;
    skin?: string;
    lastUpdate?: number;
    ip?: string;
}
interface ActivePlayerDoc {
    _id?: string;
    userId?: string;
    username?: string;
    x: number;
    y: number;
    updatedAt?: string;
    skin?: string;
}
interface Summary {
    userCount: number;
    recentJoins10m: number;
    activeBans: number;
    recentChats1h: number;
    activePlayers: number;
}

const API_BASE =
    typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:8000"
        : "https://api.dhaniverse.in";

const WEBSOCKET_BASE =
    typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:8001"
        : "https://dhaniverse-ws.azurewebsites.net";

// ------------- Modern UI Components ---------------
const PixelButton: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "danger" | "success" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
}> = ({ 
    children, 
    onClick, 
    variant = "primary", 
    size = "md", 
    disabled, 
    className = "",
    icon 
}) => {
    const baseClasses = "font-vcr tracking-wide transition-all duration-200 flex items-center gap-2 justify-center border-2 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";
    
    const variants = {
        primary: "bg-dhani-gold text-black border-dhani-gold hover:bg-dhani-gold/80",
        danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
        success: "bg-green-600 text-white border-green-600 hover:bg-green-700",
        outline: "bg-transparent text-white border-white/30 hover:border-white/60 hover:bg-white/10",
        ghost: "bg-transparent text-white/70 border-transparent hover:text-white hover:bg-white/5"
    };
    
    const sizes = {
        sm: "px-3 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {icon}
            {children}
        </button>
    );
};

const GlassPanel: React.FC<{
    title: string;
    children: React.ReactNode;
    right?: React.ReactNode;
    scroll?: boolean;
    className?: string;
    icon?: React.ReactNode;
    collapsible?: boolean;
}> = ({ title, children, right, scroll = true, className = "", icon, collapsible = false }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`relative border border-white/15 bg-black/40 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl ${className}`}
            style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
            }}
        >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    {icon && <div className="text-dhani-gold">{icon}</div>}
                    <h3 className="text-lg font-vcr text-white tracking-wide">{title}</h3>
                </div>
                <div className="flex items-center gap-3">
                    {right}
                    {collapsible && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-white/50 hover:text-white transition-colors"
                        >
                            {collapsed ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={scroll ? "max-h-96 overflow-auto p-4 custom-scrollbar" : "p-4"}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const StatCard: React.FC<{
    label: string;
    value: React.ReactNode;
    sub?: string;
    icon?: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    className?: string;
}> = ({ label, value, sub, icon, trend = "neutral", className = "" }) => {
    const trendColors = {
        up: "text-green-400",
        down: "text-red-400",
        neutral: "text-white/60"
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className={`relative group border border-white/10 rounded-xl p-6 bg-gradient-to-br from-white/5 to-transparent overflow-hidden ${className}`}
            style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)"
            }}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-dhani-gold/10 to-transparent" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-robert text-white/60 uppercase tracking-widest">
                        {label}
                    </div>
                    {icon && <div className="text-dhani-gold">{icon}</div>}
                </div>
                <div className="text-3xl font-vcr tracking-wide text-white mb-2">
                    {value}
                </div>
                {sub && (
                    <div className={`text-sm font-robert ${trendColors[trend]}`}>
                        {sub}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const ModernInput: React.FC<{
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    icon?: React.ReactNode;
    className?: string;
}> = ({ placeholder, value, onChange, type = "text", icon, className = "" }) => (
    <div className="relative">
        {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">
                {icon}
            </div>
        )}
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full bg-black/30 border border-white/20 rounded-lg py-3 ${icon ? 'pl-10' : 'pl-4'} pr-4 text-white font-robert placeholder:text-white/40 focus:outline-none focus:border-dhani-gold/50 focus:ring-1 focus:ring-dhani-gold/30 transition-all ${className}`}
        />
    </div>
);

const ModernSelect: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    className?: string;
}> = ({ value, onChange, options, className = "" }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-black/30 border border-white/20 rounded-lg py-3 px-4 text-white font-robert focus:outline-none focus:border-dhani-gold/50 focus:ring-1 focus:ring-dhani-gold/30 transition-all ${className}`}
    >
        {options.map(option => (
            <option key={option.value} value={option.value} className="bg-black">
                {option.label}
            </option>
        ))}
    </select>
);

const Tag: React.FC<{
    children: React.ReactNode;
    tone?: "neutral" | "danger" | "success" | "info" | "warning";
    size?: "sm" | "md";
}> = ({ children, tone = "neutral", size = "sm" }) => {
    const colors = {
        neutral: "bg-white/10 text-white/70 border-white/20",
        danger: "bg-red-500/20 text-red-300 border-red-500/30",
        success: "bg-green-500/20 text-green-300 border-green-500/30",
        info: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        warning: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    }[tone];
    
    const sizes = {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm"
    };
    
    return (
        <span className={`inline-flex items-center border rounded font-medium tracking-wide ${colors} ${sizes[size]}`}>
            {children}
        </span>
    );
};

// ------------- Main Component ---------------
const AdminPage: React.FC = () => {
    const { user } = useAuth();
    const token =
        typeof window !== "undefined"
            ? localStorage.getItem("dhaniverse_token")
            : null;
    const [summary, setSummary] = useState<Summary | null>(null);
    const [bans, setBans] = useState<BanEntry[]>([]);
    const [chat, setChat] = useState<ChatLog[]>([]);
    const [sessions, setSessions] = useState<SessionLog[]>([]);
    const [activeSessions, setActiveSessions] = useState<SessionLog[]>([]);
    const [ipLogs, setIpLogs] = useState<IpLog[]>([]);
    const [banForm, setBanForm] = useState({
        type: "email",
        value: "",
        reason: "",
        durationMinutes: "",
    });
    const [announce, setAnnounce] = useState("");
    const [filter, setFilter] = useState("all");
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
    const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([]);
    const [liveOnline, setLiveOnline] = useState<number | null>(null);
    const [playersSnap, setPlayersSnap] = useState<ActivePlayerDoc[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(false); // Start with refresh disabled
    const [refreshMs, setRefreshMs] = useState(10000); // Default to 10 seconds instead of 6
    const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
    const [isLoading, setIsLoading] = useState(false);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [banCheckValue, setBanCheckValue] = useState("");
    const [banCheckResult, setBanCheckResult] = useState<{
        banned: boolean;
        matches: BanEntry[];
    } | null>(null);
    const [kickForm, setKickForm] = useState({
        emailOrId: "",
        tempBanMinutes: "",
    });
    const [ipGeoData, setIpGeoData] = useState<Map<string, IpGeolocation>>(new Map());
    const [loadingGeoData, setLoadingGeoData] = useState<Set<string>>(new Set());

    const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

    const fetchIpGeolocation = useCallback(async (ip: string) => {
        if (ipGeoData.has(ip) || loadingGeoData.has(ip)) {
            return;
        }

        setLoadingGeoData(prev => new Set(prev).add(ip));
        
        try {
            // Use backend endpoint to avoid CORS issues
            const response = await fetch(`${API_BASE}/admin/geolocate-ip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({ ip })
            });
            
            if (response.ok) {
                const geoData = await response.json();
                setIpGeoData(prev => new Map(prev).set(ip, geoData));
            }
        } catch (error) {
            console.error('Failed to fetch IP geolocation:', error);
        } finally {
            setLoadingGeoData(prev => {
                const newSet = new Set(prev);
                newSet.delete(ip);
                return newSet;
            });
        }
    }, [ipGeoData, loadingGeoData, authHeaders]);

    const fetcher = useCallback(
        async (path: string) => {
            const res = await fetch(`${API_BASE}${path}`, {
                headers: authHeaders,
            });
            if (!res.ok) throw new Error('Network error');
            return res.json();
        },
        [authHeaders]
    );

    const loadAll = useCallback(async () => {
        // Prevent multiple simultaneous requests
        if (isLoading) {
            console.log('Admin data load already in progress, skipping...');
            return;
        }
        
        setIsLoading(true);
        try {
            console.log('Loading admin data...');
            const [s, b, c, sl, ips, act, ap] = await Promise.all([
                fetcher("/admin/summary"),
                fetcher("/admin/bans"),
                fetcher("/admin/chat"),
                fetcher("/admin/session-logs"),
                fetcher("/admin/ip-logs"),
                fetcher("/admin/active-sessions"),
                fetcher("/admin/active-players"),
            ]);
            setSummary(s);
            setBans(b.bans);
            setChat(c.messages);
            setSessions(sl.logs);
            setIpLogs(ips.logs);
            setActiveSessions(act.sessions);
            setPlayersSnap(ap.players);
            setLastRefresh(Date.now());
            console.log('Admin data loaded successfully');
        } catch (e) {
            console.error('Failed to load admin data:', e);
        } finally {
            setIsLoading(false);
        }
    }, [fetcher, isLoading]);

    // Initial load only once
    useEffect(() => {
        loadAll();
    }, []); // Empty dependency array for one-time load
    
    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
        };
    }, []);
    
    // Auto-refresh interval management
    useEffect(() => {
        // Clear any existing timeout
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
        
        if (!autoRefresh) {
            console.log('Auto-refresh paused');
            return;
        }
        
        console.log(`Setting up auto-refresh interval: ${refreshMs}ms`);
        
        const scheduleNextRefresh = () => {
            refreshTimeoutRef.current = setTimeout(() => {
                if (autoRefresh && !isLoading) {
                    loadAll().then(() => {
                        // Schedule the next refresh
                        scheduleNextRefresh();
                    });
                } else {
                    // If paused or loading, just schedule again
                    scheduleNextRefresh();
                }
            }, refreshMs);
        };
        
        // Start the refresh cycle
        scheduleNextRefresh();
        
        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
        };
    }, [autoRefresh, refreshMs]); // Remove loadAll and isLoading from dependencies

    // Auto-fetch geolocation for IPs when they appear
    useEffect(() => {
        // Fetch geolocation for IP logs
        ipLogs.forEach(ipLog => {
            if (ipLog.ip && !ipGeoData.has(ipLog.ip) && !loadingGeoData.has(ipLog.ip)) {
                fetchIpGeolocation(ipLog.ip);
            }
        });
        
        // Fetch geolocation for live players
        livePlayers.forEach(player => {
            if (player.ip && !ipGeoData.has(player.ip) && !loadingGeoData.has(player.ip)) {
                fetchIpGeolocation(player.ip);
            }
        });
    }, [ipLogs, livePlayers, fetchIpGeolocation, ipGeoData, loadingGeoData]);

    const submitBan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!banForm.value.trim() || isLoading) return;
        
        try {
            // Create ban in database - backend will automatically kick active users
            await fetch(`${API_BASE}/admin/ban`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({
                    ...banForm,
                    durationMinutes: banForm.durationMinutes
                        ? Number(banForm.durationMinutes)
                        : undefined,
                }),
            });
            
            setBanForm({
                type: "email",
                value: "",
                reason: "",
                durationMinutes: "",
            });
            console.log('Ban created and user immediately kicked:', banForm.value);
            // Only reload if not currently loading
            if (!isLoading) {
                loadAll();
            }
        } catch (e) {
            console.error('Failed to submit ban:', e);
        }
    };

    const unban = async (type: string, value: string) => {
        if (isLoading) return;
        
        try {
            await fetch(`${API_BASE}/admin/unban`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ type, value }),
            });
            if (!isLoading) {
                loadAll();
            }
        } catch (e) {
            console.error('Failed to unban:', e);
        }
    };

    const sendAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announce.trim()) return;
        try {
            // Use WebSocket server HTTP endpoint for real-time announcements
            await fetch(`${WEBSOCKET_BASE}/admin/announce`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ message: announce }),
            });
            setAnnounce("");
            console.log('Announcement sent to all players:', announce);
        } catch (e) {
            console.error('Failed to send announcement:', e);
        }
    };

    const checkBan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!banCheckValue.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/admin/check-ban`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({
                    email: banCheckValue.includes("@") ? banCheckValue : undefined,
                    ip: !banCheckValue.includes("@") && banCheckValue.includes(".") ? banCheckValue : undefined,
                    principal: !banCheckValue.includes("@") && !banCheckValue.includes(".") ? banCheckValue : undefined,
                }),
            });
            const data = await res.json();
            setBanCheckResult(data);
        } catch (e) {
            console.error('Failed to check ban:', e);
        }
    };

    const kickUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kickForm.emailOrId.trim()) return;
        try {
            const body: any = {};
            if (kickForm.emailOrId.includes("@")) {
                body.email = kickForm.emailOrId;
            } else {
                body.userId = kickForm.emailOrId;
            }
            if (kickForm.tempBanMinutes)
                body.tempBanMinutes = Number(kickForm.tempBanMinutes);
            
            // Use WebSocket server HTTP endpoint for real-time kick
            await fetch(`${WEBSOCKET_BASE}/admin/kick`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify(body),
            });
            setKickForm({ emailOrId: "", tempBanMinutes: "" });
            console.log('User kicked:', kickForm.emailOrId);
        } catch (e) {
            console.error('Failed to kick user:', e);
        }
    };

    const filteredChat = chat.filter((c) =>
        filter === "all"
            ? true
            : c.username?.toLowerCase() === filter.toLowerCase()
    );

    // realtime admin feed
    useEffect(() => {
        if (!token) return;
        const wsUrl =
            (window.location.hostname === "localhost"
                ? "ws://localhost:8001"
                : "wss://dhaniverse-ws.azurewebsites.net") +
            `/admin-feed?token=${token}`;
        let ws: WebSocket | null = new WebSocket(wsUrl);
        
        ws.onopen = () => console.log('Admin websocket connected');
        ws.onerror = (e) => console.error('Admin websocket error:', e);
        ws.onclose = () => console.log('Admin websocket closed');
        
        ws.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                switch (msg.type) {
                    case "adminSnapshot":
                        setLivePlayers(msg.players || []);
                        setLiveOnline(msg.online);
                        break;
                    case "adminLiveUpdate":
                        // Handle periodic live updates from WebSocket server
                        setLivePlayers(msg.players || []);
                        setLiveOnline(msg.online);
                        break;
                    case "adminPlayerUpdate":
                        setLivePlayers((prev) => {
                            const idx = prev.findIndex(
                                (p) => p.connectionId === msg.connectionId
                            );
                            if (idx >= 0) {
                                const updated = [...prev];
                                updated[idx] = {
                                    ...updated[idx],
                                    x: msg.x,
                                    y: msg.y,
                                    animation: msg.animation,
                                    lastUpdate: Date.now(),
                                };
                                return updated;
                            }
                            return prev;
                        });
                        break;
                    case "adminPlayerJoin":
                        setLivePlayers((prev) => [
                            ...prev.filter(
                                (p) => p.connectionId !== msg.connectionId
                            ),
                            {
                                connectionId: msg.connectionId,
                                userId: msg.userId,
                                username: msg.username,
                                email: msg.email,
                                x: msg.x,
                                y: msg.y,
                                animation: msg.animation,
                                skin: msg.skin,
                                ip: msg.ip,
                                lastUpdate: Date.now(),
                            },
                        ]);
                        // Update online count when player joins
                        setLiveOnline(prev => (prev || 0) + 1);
                        break;
                    case "adminPlayerDisconnect":
                        setLivePlayers((prev) =>
                            prev.filter(
                                (p) => p.connectionId !== msg.connectionId
                            )
                        );
                        // Update online count when player leaves
                        setLiveOnline(prev => Math.max(0, (prev || 0) - 1));
                        break;
                    case "adminOnlineCount":
                        setLiveOnline(msg.count);
                        break;
                    case "adminChat":
                        // Prepend new chat message to avoid duplicates
                        setChat(prev => {
                            const exists = prev.some(c => 
                                c.username === msg.username && 
                                c.message === msg.message && 
                                Math.abs(new Date(c.timestamp).getTime() - Date.now()) < 5000
                            );
                            if (exists) return prev;
                            return [{
                                _id: `live_${Date.now()}_${Math.random()}`,
                                username: msg.username,
                                message: msg.message,
                                timestamp: new Date().toISOString(),
                                userId: msg.userId
                            }, ...prev.slice(0, 199)];
                        });
                        break;
                    case "adminAction":
                        // Show real-time admin action feedback
                        const action = msg.action;
                        const target = msg.target;
                        console.log(`✅ Admin action completed: ${action} on ${target}`, msg);
                        
                        // Update UI immediately based on action
                        if (action === 'kick' && msg.kicked > 0) {
                            // Remove kicked player from live players
                            setLivePlayers(prev => 
                                prev.filter(p => p.userId !== target && p.email !== target)
                            );
                        } else if (action === 'ban' && msg.kicked > 0) {
                            // Remove banned player from live players
                            setLivePlayers(prev => 
                                prev.filter(p => 
                                    !(msg.banType === 'email' && p.email === target) &&
                                    !(msg.banType === 'ip' && p.ip === target)
                                )
                            );
                        }
                        break;
                }
            } catch (e) {
                console.error('Failed to parse admin websocket message:', e);
            }
        };
        
        return () => {
            try {
                ws?.close();
            } catch {
                /* ignore */
            }
        };
    }, [token]);

    const forceKick = async (userId?: string) => {
        if (!userId) return;
        try {
            // Use WebSocket server HTTP endpoint for real-time kick
            await fetch(`${WEBSOCKET_BASE}/admin/kick`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ userId, reason: "Kicked by admin" }),
            });
            console.log('Force kicked user:', userId);
        } catch (e) {
            console.error('Failed to kick user:', e);
        }
    };

    if (!user)
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-vcr mb-2">Access Denied</h1>
                    <p className="text-white/60 font-robert">Please sign in to continue</p>
                </div>
            </div>
        );
        
    if (adminEmail && user.email.toLowerCase() !== adminEmail)
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-vcr mb-2">Admin Only</h1>
                    <p className="text-white/60 font-robert">
                        Signed in as: <span className="text-dhani-gold">{user.email}</span>
                    </p>
                    <p className="text-red-400 font-robert mt-2">This area is restricted to administrators.</p>
                </div>
            </div>
        );

    return (
        <div 
            className="min-h-screen text-white relative"
            style={{
                background: "radial-gradient(ellipse at top, rgba(0,0,0,0.8) 0%, black 100%)",
            }}
        >
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-dhani-gold/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 border-b border-white/10 bg-black/30 backdrop-blur-md"
            >
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-dhani-gold/20 to-dhani-gold/5 border border-dhani-gold/30">
                                <Shield className="w-8 h-8 text-dhani-gold" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-vcr tracking-wide text-white">
                                    Admin Dashboard
                                </h1>
                                <p className="text-white/60 font-robert text-sm mt-1">
                                    Welcome back, <span className="text-dhani-gold">{user.email}</span>
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${autoRefresh ? (isLoading ? 'bg-yellow-400' : 'bg-green-400') : 'bg-red-400'} ${autoRefresh && !isLoading ? 'animate-pulse' : ''}`} />
                                <span className="text-sm font-robert text-white/60">
                                    {isLoading ? 'Loading...' : autoRefresh ? `Live (${Math.round(refreshMs / 1000)}s)` : 'Paused'}
                                </span>
                            </div>
                            <PixelButton
                                variant={autoRefresh ? "success" : "outline"}
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                icon={autoRefresh ? <Pause size={16} /> : <Play size={16} />}
                                size="sm"
                                disabled={isLoading}
                            >
                                {autoRefresh ? 'Pause' : 'Resume'}
                            </PixelButton>
                            <PixelButton
                                variant="outline"
                                onClick={loadAll}
                                icon={<RefreshCw size={16} />}
                                size="sm"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Loading...' : 'Refresh Now'}
                            </PixelButton>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard 
                        label="Total Users" 
                        value={summary?.userCount ?? "—"} 
                        icon={<Users size={20} />}
                        sub="Registered accounts"
                    />
                    <StatCard 
                        label="Recent Joins" 
                        value={summary?.recentJoins10m ?? "—"} 
                        icon={<Activity size={20} />}
                        sub="Last 10 minutes"
                        trend="up"
                    />
                    <StatCard 
                        label="Active Bans" 
                        value={summary?.activeBans ?? "—"} 
                        icon={<Ban size={20} />}
                        sub="Currently enforced"
                        trend={summary?.activeBans ? "down" : "neutral"}
                    />
                    <StatCard 
                        label="Chat Activity" 
                        value={summary?.recentChats1h ?? "—"} 
                        icon={<MessageSquare size={20} />}
                        sub="Last hour"
                        trend="neutral"
                    />
                    <StatCard 
                        label="Live Players" 
                        value={liveOnline ?? livePlayers.length} 
                        icon={<Monitor size={20} />}
                        sub="Real-time count"
                        trend="up"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column - Actions */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <GlassPanel 
                            title="Quick Actions" 
                            icon={<Zap />}
                            collapsible
                        >
                            <div className="space-y-4">
                                {/* Ban User */}
                                <form onSubmit={submitBan} className="space-y-3">
                                    <h4 className="text-sm font-vcr text-white/80 uppercase tracking-wide">
                                        Ban User
                                    </h4>
                                    <ModernSelect
                                        value={banForm.type}
                                        onChange={(value) => setBanForm(prev => ({ ...prev, type: value }))}
                                        options={[
                                            { value: "email", label: "Email Address" },
                                            { value: "internet_identity", label: "Internet Identity" },
                                            { value: "ip", label: "IP Address" }
                                        ]}
                                    />
                                    <ModernInput
                                        placeholder="Enter email, IP, or principal"
                                        value={banForm.value}
                                        onChange={(value) => setBanForm(prev => ({ ...prev, value }))}
                                        icon={<Search size={16} />}
                                    />
                                    <ModernInput
                                        placeholder="Reason (optional)"
                                        value={banForm.reason}
                                        onChange={(value) => setBanForm(prev => ({ ...prev, reason: value }))}
                                    />
                                    <ModernInput
                                        placeholder="Duration in minutes (empty = permanent)"
                                        value={banForm.durationMinutes}
                                        onChange={(value) => setBanForm(prev => ({ ...prev, durationMinutes: value }))}
                                        type="number"
                                        icon={<Clock size={16} />}
                                    />
                                    <PixelButton
                                        variant="danger"
                                        icon={<Ban size={16} />}
                                        disabled={!banForm.value.trim()}
                                        className="w-full"
                                    >
                                        Apply Ban
                                    </PixelButton>
                                </form>

                                {/* Kick User */}
                                <form onSubmit={kickUser} className="space-y-3">
                                    <h4 className="text-sm font-vcr text-white/80 uppercase tracking-wide">
                                        Kick User
                                    </h4>
                                    <ModernInput
                                        placeholder="Email or User ID"
                                        value={kickForm.emailOrId}
                                        onChange={(value) => setKickForm(prev => ({ ...prev, emailOrId: value }))}
                                        icon={<UserX size={16} />}
                                    />
                                    <ModernInput
                                        placeholder="Temp ban minutes (optional)"
                                        value={kickForm.tempBanMinutes}
                                        onChange={(value) => setKickForm(prev => ({ ...prev, tempBanMinutes: value }))}
                                        type="number"
                                    />
                                    <PixelButton
                                        variant="danger"
                                        icon={<UserX size={16} />}
                                        disabled={!kickForm.emailOrId.trim()}
                                        className="w-full"
                                    >
                                        Kick User
                                    </PixelButton>
                                </form>

                                {/* Check Ban Status */}
                                <form onSubmit={checkBan} className="space-y-3">
                                    <h4 className="text-sm font-vcr text-white/80 uppercase tracking-wide">
                                        Check Ban Status
                                    </h4>
                                    <ModernInput
                                        placeholder="Email, IP, or principal"
                                        value={banCheckValue}
                                        onChange={setBanCheckValue}
                                        icon={<Search size={16} />}
                                    />
                                    <PixelButton
                                        variant="outline"
                                        icon={<Eye size={16} />}
                                        disabled={!banCheckValue.trim()}
                                        className="w-full"
                                    >
                                        Check Status
                                    </PixelButton>
                                    {banCheckResult && (
                                        <div className={`p-3 rounded-lg border ${banCheckResult.banned ? 'border-red-500/30 bg-red-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {banCheckResult.banned ? 
                                                    <Ban className="w-4 h-4 text-red-400" /> :
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                }
                                                <span className={`text-sm font-vcr ${banCheckResult.banned ? 'text-red-400' : 'text-green-400'}`}>
                                                    {banCheckResult.banned ? 'BANNED' : 'NOT BANNED'}
                                                </span>
                                            </div>
                                            {banCheckResult.matches.length > 0 && (
                                                <div className="space-y-1">
                                                    {banCheckResult.matches.map((match, i) => (
                                                        <div key={i} className="text-xs text-white/60">
                                                            {match.type}: {match.value} - {match.reason || 'No reason'}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </form>

                                {/* Send Announcement */}
                                <form onSubmit={sendAnnouncement} className="space-y-3">
                                    <h4 className="text-sm font-vcr text-white/80 uppercase tracking-wide">
                                        Broadcast Announcement
                                    </h4>
                                    <ModernInput
                                        placeholder="Type your message..."
                                        value={announce}
                                        onChange={setAnnounce}
                                        icon={<Volume2 size={16} />}
                                    />
                                    <PixelButton
                                        variant="primary"
                                        icon={<Volume2 size={16} />}
                                        disabled={!announce.trim()}
                                        className="w-full"
                                    >
                                        Send Announcement
                                    </PixelButton>
                                </form>
                            </div>
                        </GlassPanel>

                        {/* Active Bans */}
                        <GlassPanel 
                            title="Active Bans" 
                            icon={<Ban />}
                            right={<Tag tone="danger">{bans.filter(b => b.active).length}</Tag>}
                            collapsible
                        >
                            <div className="space-y-3">
                                {bans.filter(b => b.active).slice(0, 20).map((ban) => (
                                    <div
                                        key={ban._id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Tag tone="danger" size="sm">{ban.type}</Tag>
                                                <span className="text-sm font-mono text-white truncate">
                                                    {ban.value}
                                                </span>
                                            </div>
                                            {ban.reason && (
                                                <p className="text-xs text-white/60 truncate">
                                                    {ban.reason}
                                                </p>
                                            )}
                                            {ban.expiresAt && (
                                                <p className="text-xs text-orange-400">
                                                    Expires: {new Date(ban.expiresAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <PixelButton
                                            variant="success"
                                            size="sm"
                                            onClick={() => unban(ban.type, ban.value)}
                                            icon={<CheckCircle size={14} />}
                                        >
                                            Unban
                                        </PixelButton>
                                    </div>
                                ))}
                                {bans.filter(b => b.active).length === 0 && (
                                    <div className="text-center py-8 text-white/40">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm font-robert">No active bans</p>
                                    </div>
                                )}
                            </div>
                        </GlassPanel>
                    </div>

                    {/* Middle Column - Live Data */}
                    <div className="space-y-6">
                        {/* Live Players */}
                        <GlassPanel 
                            title="Live Players" 
                            icon={<Activity />}
                            right={
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <Tag tone="success">
                                        {liveOnline !== null ? liveOnline : livePlayers.length} online
                                    </Tag>
                                    {liveOnline !== null && liveOnline !== livePlayers.length && (
                                        <Tag tone="info" size="sm">
                                            {livePlayers.length} visible
                                        </Tag>
                                    )}
                                </div>
                            }
                            collapsible
                        >
                            {/* World Map Overview */}
                            {livePlayers.some(p => p.ip && ipGeoData.has(p.ip)) && (
                                <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                                    <h5 className="text-sm font-vcr text-white/80 mb-2">🌍 Global Player Distribution</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from(
                                            livePlayers
                                                .filter(p => p.ip && ipGeoData.has(p.ip))
                                                .reduce((acc, player) => {
                                                    const geo = ipGeoData.get(player.ip!);
                                                    if (geo) {
                                                        const key = `${geo.country_code}-${geo.country_name}`;
                                                        acc.set(key, (acc.get(key) || 0) + 1);
                                                    }
                                                    return acc;
                                                }, new Map<string, number>())
                                        ).map(([countryInfo, count]) => {
                                            const [code, name] = countryInfo.split('-');
                                            return (
                                                <div key={countryInfo} className="flex items-center gap-1">
                                                    <Tag tone="info" size="sm">
                                                        {code}
                                                    </Tag>
                                                    <span className="text-xs text-white/60">
                                                        {name} ({count})
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                {livePlayers.map((player) => {
                                    const idleMs = Date.now() - (player.lastUpdate || 0);
                                    const idleMin = Math.floor(idleMs / 60000);
                                    const isIdle = idleMs > 120000; // 2 minutes
                                    const geoData = player.ip ? ipGeoData.get(player.ip) : null;
                                    const isLoadingGeo = player.ip ? loadingGeoData.has(player.ip) : false;
                                    
                                    return (
                                        <div
                                            key={player.connectionId}
                                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-3 h-3 rounded-full ${isIdle ? 'bg-yellow-400' : 'bg-green-400'} flex-shrink-0`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="text-sm font-vcr text-dhani-gold">
                                                            {player.username || player.userId?.slice(0, 8) || "Anonymous"}
                                                        </div>
                                                        {geoData && (
                                                            <div className="flex items-center gap-1">
                                                                <Tag tone={geoData.is_proxy ? "warning" : "success"} size="sm">
                                                                    {geoData.country_code}
                                                                </Tag>
                                                                {geoData.is_proxy && (
                                                                    <Tag tone="warning" size="sm">PROXY</Tag>
                                                                )}
                                                            </div>
                                                        )}
                                                        {isLoadingGeo && (
                                                            <div className="w-3 h-3 border border-dhani-gold/30 border-t-dhani-gold rounded-full animate-spin" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-white/50">
                                                        Game Position: ({player.x}, {player.y})
                                                        {isIdle && <span className="text-yellow-400 ml-2">Idle {idleMin}m</span>}
                                                    </div>
                                                    {geoData && (
                                                        <div className="text-xs text-white/40 space-y-1">
                                                            <div className="flex items-center gap-1">
                                                                <span>📍</span>
                                                                <span className="truncate">
                                                                    {geoData.city_name}, {geoData.region_name}, {geoData.country_name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span>🌐 {geoData.time_zone}</span>
                                                                <span>•</span>
                                                                <span>ISP: {geoData.as?.split(' ')[0] || 'Unknown'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {player.ip && (
                                                        <div className="text-xs text-white/30 font-mono">
                                                            IP: {player.ip}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                {geoData && (
                                                    <PixelButton
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(`https://www.google.com/maps?q=${geoData.latitude},${geoData.longitude}`, '_blank')}
                                                        icon={<Globe size={14} />}
                                                    >
                                                        Map
                                                    </PixelButton>
                                                )}
                                                {player.ip && (
                                                    <PixelButton
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setBanForm(prev => ({ 
                                                            ...prev, 
                                                            type: "ip", 
                                                            value: player.ip! 
                                                        }))}
                                                        icon={<Ban size={14} />}
                                                    >
                                                        Ban IP
                                                    </PixelButton>
                                                )}
                                                <PixelButton
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => forceKick(player.userId)}
                                                    icon={<UserX size={14} />}
                                                >
                                                    Kick
                                                </PixelButton>
                                            </div>
                                        </div>
                                    );
                                })}
                                {livePlayers.length === 0 && (
                                    <div className="text-center py-8 text-white/40">
                                        <Users className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm font-robert">No players online</p>
                                    </div>
                                )}
                            </div>
                        </GlassPanel>

                        {/* Chat Monitor */}
                        <GlassPanel 
                            title="Live Chat" 
                            icon={<MessageSquare />}
                            right={
                                <ModernInput
                                    placeholder="Filter by user..."
                                    value={filter === "all" ? "" : filter}
                                    onChange={(value) => setFilter(value || "all")}
                                    className="w-32 text-xs py-1"
                                />
                            }
                            collapsible
                        >
                            <div className="space-y-2">
                                {filteredChat.slice(0, 50).map((msg) => (
                                    <div
                                        key={msg._id}
                                        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-vcr text-dhani-gold">
                                                        {msg.username || "Anonymous"}
                                                    </span>
                                                    <span className="text-xs text-white/40">
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-white/90 break-words">
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredChat.length === 0 && (
                                    <div className="text-center py-8 text-white/40">
                                        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm font-robert">No messages</p>
                                    </div>
                                )}
                            </div>
                        </GlassPanel>
                    </div>

                    {/* Right Column - Logs & Data */}
                    <div className="space-y-6">
                        {/* Session Logs */}
                        <GlassPanel 
                            title="Session Activity" 
                            icon={<Clock />}
                            right={<Tag tone="info">{sessions.length}</Tag>}
                            collapsible
                        >
                            <div className="space-y-2">
                                {sessions.slice(0, 30).map((session) => (
                                    <div
                                        key={session._id}
                                        className="flex items-center justify-between p-2 rounded bg-white/5"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Tag 
                                                    tone={session.event === 'join' ? 'success' : 'info'} 
                                                    size="sm"
                                                >
                                                    {session.event}
                                                </Tag>
                                                <span className="text-sm text-white/80 truncate">
                                                    {session.username || session.email?.split('@')[0] || "Unknown"}
                                                </span>
                                            </div>
                                            <div className="text-xs text-white/50">
                                                {new Date(session.timestamp).toLocaleString()}
                                                {session.ip && ` • ${session.ip}`}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassPanel>

                        {/* IP Logs */}
                        <GlassPanel 
                            title="IP Activity" 
                            icon={<Globe />}
                            right={<Tag tone="info">{ipLogs.length}</Tag>}
                            collapsible
                        >
                            <div className="space-y-2">
                                {ipLogs.slice(0, 30).map((ipLog) => {
                                    const geoData = ipGeoData.get(ipLog.ip);
                                    const isLoadingGeo = loadingGeoData.has(ipLog.ip);
                                    
                                    return (
                                        <div
                                            key={ipLog._id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="text-sm font-mono text-white/90 font-semibold">
                                                        {ipLog.ip}
                                                    </div>
                                                    {geoData && (
                                                        <div className="flex items-center gap-1">
                                                            <Tag tone={geoData.is_proxy ? "warning" : "info"} size="sm">
                                                                {geoData.country_code}
                                                            </Tag>
                                                            {geoData.is_proxy && (
                                                                <Tag tone="warning" size="sm">PROXY</Tag>
                                                            )}
                                                        </div>
                                                    )}
                                                    {isLoadingGeo && (
                                                        <div className="w-4 h-4 border-2 border-dhani-gold/30 border-t-dhani-gold rounded-full animate-spin" />
                                                    )}
                                                </div>
                                                
                                                {geoData && (
                                                    <div className="text-xs text-white/70 mb-1">
                                                        📍 {geoData.city_name}, {geoData.region_name}, {geoData.country_name}
                                                        {geoData.zip_code && ` (${geoData.zip_code})`}
                                                    </div>
                                                )}
                                                
                                                <div className="text-xs text-white/50">
                                                    {ipLog.email || ipLog.userId?.slice(0, 8) || "Unknown"} • {ipLog.count} requests
                                                </div>
                                                <div className="text-xs text-white/40">
                                                    Last seen: {new Date(ipLog.lastSeen).toLocaleString()}
                                                    {geoData?.time_zone && ` (${geoData.time_zone})`}
                                                </div>
                                                
                                                {geoData && (
                                                    <div className="text-xs text-white/30 mt-1">
                                                        ISP: {geoData.as} • ASN: {geoData.asn}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <PixelButton
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => setBanForm(prev => ({ 
                                                        ...prev, 
                                                        type: "ip", 
                                                        value: ipLog.ip 
                                                    }))}
                                                    icon={<Ban size={14} />}
                                                >
                                                    Ban IP
                                                </PixelButton>
                                                {geoData && (
                                                    <PixelButton
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(`https://www.google.com/maps?q=${geoData.latitude},${geoData.longitude}`, '_blank')}
                                                        icon={<Globe size={14} />}
                                                    >
                                                        Map
                                                    </PixelButton>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassPanel>

                        {/* System Info */}
                        <GlassPanel 
                            title="System Status" 
                            icon={<Database />}
                            collapsible
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Refresh Rate</span>
                                    <ModernSelect
                                        value={refreshMs.toString()}
                                        onChange={(value) => {
                                            const newRefreshMs = Number(value);
                                            setRefreshMs(newRefreshMs);
                                            console.log(`Refresh rate changed to ${newRefreshMs}ms`);
                                        }}
                                        options={[
                                            { value: "1000", label: "1s" },
                                            { value: "3000", label: "3s" },
                                            { value: "6000", label: "6s" },
                                            { value: "10000", label: "10s" },
                                            { value: "30000", label: "30s" }
                                        ]}
                                        className="w-20 text-xs py-1"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Auto Refresh</span>
                                    <Tag tone={autoRefresh ? "success" : "neutral"}>
                                        {autoRefresh ? "Active" : "Paused"}
                                    </Tag>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">WebSocket</span>
                                    <Tag tone="success">Connected</Tag>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Database</span>
                                    <Tag tone="success">Healthy</Tag>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Last Update</span>
                                    <span className="text-xs text-white/50">
                                        {new Date(lastRefresh).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Next Refresh</span>
                                    <span className="text-xs text-white/50">
                                        {autoRefresh ? `${Math.round(refreshMs / 1000)}s` : "Manual"}
                                    </span>
                                </div>
                            </div>
                        </GlassPanel>
                    </div>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
};

export default AdminPage;
