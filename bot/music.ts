import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    AudioPlayer,
    VoiceConnection,
    AudioResource
} from '@discordjs/voice';
import { Readable, PassThrough } from 'stream';
import { spawn } from 'child_process';
import play from 'play-dl';
import ytDlpExec from 'yt-dlp-exec';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import path from 'path';
import https from 'https';
import {
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
    EmbedBuilder,
    ChatInputCommandInteraction
} from 'discord.js';

const IS_WINDOWS = process.platform === 'win32';
const YT_DLP_BINARY_NAME = IS_WINDOWS
    ? 'yt-dlp.exe'
    : process.platform === 'darwin'
    ? 'yt-dlp_macos'
    : process.arch === 'arm64'
    ? 'yt-dlp_linux_aarch64'
    : 'yt-dlp_linux';
const YT_DLP_DIR = path.join(process.cwd(), '.bin');
const YT_DLP_BINARY_PATH = path.join(YT_DLP_DIR, IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp');
const YT_DLP_DOWNLOAD_URL = `https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/${YT_DLP_BINARY_NAME}`;
const YT_DLP_BUNDLED_PATH = path.join(
    process.cwd(),
    'node_modules',
    'yt-dlp-exec',
    'bin',
    IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp'
);

interface YtDlpState {
    binaryPath: string;
    isNightly: boolean;
    client: typeof ytDlpExec;
}

let ytDlpStatePromise: Promise<YtDlpState> | null = null;
let ytdlAgent: ytdl.Agent | undefined;
let cookiesFilePath: string | undefined;

function downloadFileWithRedirects(url: string, destPath: string, redirects = 0): Promise<void> {
    return new Promise((resolve, reject) => {
        if (redirects > 5) {
            return reject(new Error('Too many redirects while downloading yt-dlp'));
        }

        const tempPath = `${destPath}.tmp`;
        const req = https.get(url, { headers: { 'User-Agent': 'HelenAI-Bot/1.0' } }, (res) => {
            if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                res.resume();
                downloadFileWithRedirects(res.headers.location, destPath, redirects + 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Failed to download yt-dlp: HTTP ${res.statusCode}`));
            }

            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            const file = fs.createWriteStream(tempPath);

            res.pipe(file);

            file.on('finish', () => {
                file.close(() => {
                    try {
                        if (!IS_WINDOWS) {
                            fs.chmodSync(tempPath, 0o755);
                        }
                        fs.renameSync(tempPath, destPath);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            file.on('error', (err) => {
                fs.unlink(tempPath, () => reject(err));
            });
        });

        req.on('error', (err) => {
            fs.unlink(tempPath, () => reject(err));
        });
    });
}

function ensureYtDlp(): Promise<YtDlpState> {
    if (ytDlpStatePromise) return ytDlpStatePromise;

    ytDlpStatePromise = (async () => {
        try {
            const exists = fs.existsSync(YT_DLP_BINARY_PATH);
            const validSize = exists && fs.statSync(YT_DLP_BINARY_PATH).size > 1024 * 1024;

            if (!validSize) {
                if (exists) fs.unlinkSync(YT_DLP_BINARY_PATH);
                console.log('[Setup] Downloading latest yt-dlp nightly binary...');
                await downloadFileWithRedirects(YT_DLP_DOWNLOAD_URL, YT_DLP_BINARY_PATH);
                console.log('[Setup] ✅ yt-dlp nightly binary downloaded and ready.');
            } else {
                if (!IS_WINDOWS) {
                    try {
                        fs.chmodSync(YT_DLP_BINARY_PATH, 0o755);
                    } catch {
                        // Ignore chmod errors if already executable
                    }
                }
                console.log('[Setup] ✅ Local yt-dlp nightly binary found and ready.');
            }

            return {
                binaryPath: YT_DLP_BINARY_PATH,
                isNightly: true,
                client: (ytDlpExec as any).create(YT_DLP_BINARY_PATH)
            };
        } catch (err) {
            console.error('[Setup] ⚠️ Nightly yt-dlp download failed, falling back to yt-dlp-exec binary:', err);
            return {
                binaryPath: YT_DLP_BUNDLED_PATH,
                isNightly: false,
                client: ytDlpExec
            };
        }
    })();

    return ytDlpStatePromise;
}

// Kick off binary checks/downloads at startup without blocking HTTP server boot
ensureYtDlp().catch((err) => console.error('[Setup] yt-dlp init error:', err));

let ffmpegInitPromise: Promise<void> | null = null;
function ensureFfmpeg(): Promise<void> {
    if (ffmpegInitPromise) return ffmpegInitPromise;

    ffmpegInitPromise = (async () => {
        try {
            const prismMod: any = await import('prism-media');
            const FFmpeg = prismMod.default?.FFmpeg ?? prismMod.FFmpeg;
            FFmpeg.getInfo(true);
            console.log('[Setup] ✅ FFmpeg found and ready.');
            return;
        } catch {
            console.log('[Setup] FFmpeg missing (install script may have been skipped); downloading via ffmpeg-static...');
        }

        const installerPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'install.js');
        if (!fs.existsSync(installerPath)) {
            console.warn('[Setup] ⚠️ ffmpeg-static installer not found; audio playback requires system ffmpeg.');
            return;
        }

        await new Promise<void>((resolve) => {
            const proc = spawn(process.execPath, [installerPath], {
                cwd: path.dirname(installerPath),
                stdio: 'inherit'
            });
            proc.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const prismMod: any = await import('prism-media');
                        const FFmpeg = prismMod.default?.FFmpeg ?? prismMod.FFmpeg;
                        FFmpeg.getInfo(true);
                        console.log('[Setup] ✅ FFmpeg installed and ready.');
                    } catch (err: any) {
                        console.warn('[Setup] ⚠️ FFmpeg downloaded, check warning:', err?.message);
                    }
                } else {
                    console.error(`[Setup] ❌ ffmpeg-static installer exited with code ${code}`);
                }
                resolve();
            });
            proc.on('error', (err) => {
                console.error('[Setup] ❌ Failed to run ffmpeg-static installer:', err);
                resolve();
            });
        });
    })();

    return ffmpegInitPromise;
}

ensureFfmpeg().catch((err) => console.error('[Setup] ffmpeg init error:', err));

function applyParsedCookies(cookieStr: string, cookiesArray: any[]) {
    if (cookieStr.trim()) {
        play.setToken({ youtube: { cookie: cookieStr.trim() } });
        console.log('[Cookies] ✅ YouTube cookies configured for play-dl.');
    }
    if (cookiesArray.length > 0) {
        ytdlAgent = ytdl.createAgent(cookiesArray);
        console.log('[Cookies] ✅ ytdlAgent created from YouTube cookies.');
    }
}

function parseNetscapeCookies(content: string): { cookieStr: string; cookiesArray: any[] } {
    let cookieStr = '';
    const cookiesArray: any[] = [];

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const parts = line.split('\t');
        if (parts.length < 7) continue;

        const domain = parts[0];
        const pathUrl = parts[2] || '/';
        const secure = parts[3] === 'TRUE';
        const parsedExp = Number.parseInt(parts[4], 10);
        const expirationDate = Number.isFinite(parsedExp) ? parsedExp : undefined;
        const name = parts[5];
        const value = parts.slice(6).join('\t').trim();

        if (!name) continue;
        cookieStr += `${name}=${value}; `;
        cookiesArray.push({ name, value, domain, path: pathUrl, secure, expirationDate });
    }

    return { cookieStr, cookiesArray };
}

function initializeCookies() {
    // 1. Prioritize YOUTUBE_COOKIES env var (Render / cloud deployments)
    const envCookies = process.env.YOUTUBE_COOKIES?.trim();
    if (envCookies) {
        const envCookiePath = path.join(process.cwd(), 'youtube-cookies-env.txt');
        try {
            if (envCookies.startsWith('[') || envCookies.startsWith('{')) {
                const parsed = JSON.parse(envCookies);
                const cookieList = Array.isArray(parsed) ? parsed : [parsed];
                let netscape = '# Netscape HTTP Cookie File\n';
                let cookieStr = '';
                const cookiesArray: any[] = [];

                for (const cookie of cookieList) {
                    if (!cookie?.name) continue;
                    const domain = cookie.domain || '.youtube.com';
                    const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
                    const pathUrl = cookie.path || '/';
                    const secure = cookie.secure ? 'TRUE' : 'FALSE';
                    const expiration = cookie.expirationDate ? Math.round(cookie.expirationDate) : 0;
                    const value = String(cookie.value ?? '');

                    netscape += `${domain}\t${includeSubdomains}\t${pathUrl}\t${secure}\t${expiration}\t${cookie.name}\t${value}\n`;
                    cookieStr += `${cookie.name}=${value}; `;
                    cookiesArray.push({
                        name: cookie.name,
                        value,
                        domain,
                        path: pathUrl,
                        secure: Boolean(cookie.secure),
                        expirationDate: expiration || undefined
                    });
                }

                fs.writeFileSync(envCookiePath, netscape, 'utf8');
                cookiesFilePath = envCookiePath;
                console.log('[Cookies] ✅ YouTube cookies loaded from YOUTUBE_COOKIES (JSON).');
                applyParsedCookies(cookieStr, cookiesArray);
                return;
            }

            // Also support raw Netscape cookies.txt text pasted into YOUTUBE_COOKIES
            fs.writeFileSync(envCookiePath, envCookies, 'utf8');
            cookiesFilePath = envCookiePath;
            const { cookieStr, cookiesArray } = parseNetscapeCookies(envCookies);
            console.log('[Cookies] ✅ YouTube cookies loaded from YOUTUBE_COOKIES (Netscape).');
            applyParsedCookies(cookieStr, cookiesArray);
            return;
        } catch (err) {
            console.error('[Cookies] ❌ Failed to parse YOUTUBE_COOKIES env var:', err);
        }
    }

    // 2. Fallback to local cookies.txt for local development
    const localCookieCandidates = [
        path.join(process.cwd(), 'cookies.txt'),
        path.join(process.cwd(), 'youtube-cookies.txt')
    ];

    for (const candidate of localCookieCandidates) {
        if (!fs.existsSync(candidate)) continue;
        cookiesFilePath = candidate;
        console.log(`[Cookies] ✅ Using local cookies file: ${candidate}`);
        try {
            const content = fs.readFileSync(candidate, 'utf8');
            const { cookieStr, cookiesArray } = parseNetscapeCookies(content);
            applyParsedCookies(cookieStr, cookiesArray);
        } catch (err) {
            console.error('[Cookies] ❌ Failed to parse local cookies file:', err);
        }
        return;
    }

    console.log('[Cookies] ⚠️ No cookies configured. YouTube may rate-limit or block datacenter IPs.');
}

initializeCookies();

interface QueueItem {
    title: string;
    url: string;
    requestedBy: string;
    thumbnail?: string;
    duration?: string;
    channel?: string;
    isAutoplay?: boolean;
}

interface ServerQueue {
    voiceChannelId: string;
    textChannelId: string;
    connection: VoiceConnection;
    player: AudioPlayer;
    songs: QueueItem[];
    history: QueueItem[];
    playing: boolean;
    autoplay: boolean;
    loop: boolean;
    volume: number;
    audioResource: AudioResource | null;
    lastPlayedUrl?: string;
    isGoingBack?: boolean;
    isFetchingAutoplay?: boolean;
    lastSongErrored?: boolean;
    isStartingTrack?: boolean;
    leaveTimeout?: NodeJS.Timeout;
}

const queue = new Map<string, ServerQueue>();

function formatDurationSeconds(seconds?: number): string {
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function extractYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
}

function isYouTubePlaylistUrl(url: string): boolean {
    if (url.includes('playlist?list=')) return true;
    return url.includes('list=') && !extractYouTubeVideoId(url);
}

async function fetchYtDlpJson(target: string, extraFlags: Record<string, any> = {}): Promise<any> {
    const { client, isNightly } = await ensureYtDlp();

    const buildFlags = (useCookies: boolean) => {
        const flags: Record<string, any> = {
            dumpSingleJson: true,
            noWarnings: true,
            forceIpv4: true,
            extractorArgs: useCookies
                ? 'youtube:player_client=tv,web,mweb'
                : 'youtube:player_client=default,android,ios,tv',
            ...extraFlags
        };
        if (isNightly) {
            flags.jsRuntimes = 'node';
        }
        if (useCookies && cookiesFilePath) {
            flags.cookies = cookiesFilePath;
        }
        return flags;
    };

    if (cookiesFilePath) {
        try {
            return await (client as any)(target, buildFlags(true));
        } catch (err) {
            console.warn('[yt-dlp JSON] Cookie attempt failed, retrying without cookies:', (err as any)?.message?.substring(0, 150));
        }
    }

    return await (client as any)(target, buildFlags(false));
}

function mapYtDlpEntryToQueueItem(entry: any, requestedBy: string, isAutoplay = false): QueueItem | null {
    const videoUrl = entry?.webpage_url
        || (typeof entry?.url === 'string' && entry.url.startsWith('http') ? entry.url : null)
        || (entry?.id ? `https://www.youtube.com/watch?v=${entry.id}` : null);

    if (!videoUrl) return null;
    if (entry?.title === '[Private video]' || entry?.title === '[Deleted video]') return null;

    const thumbnails = Array.isArray(entry?.thumbnails) ? entry.thumbnails : [];
    const thumbnail = entry?.thumbnail || thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;

    return {
        title: entry?.title || 'Unknown Title',
        url: videoUrl,
        requestedBy,
        thumbnail,
        duration: entry?.duration ? formatDurationSeconds(entry.duration) : 'Unknown',
        channel: entry?.uploader || entry?.channel || 'Unknown',
        isAutoplay
    };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        promise.then(
            (val) => {
                clearTimeout(timer);
                resolve(val);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}

async function searchYouTubeTrack(searchStr: string, requestedBy: string): Promise<QueueItem | null> {
    // 1. Try play-dl search with short timeout
    try {
        const searchResults = await withTimeout(play.search(searchStr, { limit: 1 }), 8_000, 'play.search');
        if (searchResults && searchResults.length > 0) {
            const first = searchResults[0];
            return {
                title: first.title || 'Unknown Title',
                url: first.url,
                requestedBy,
                thumbnail: first.thumbnails[0]?.url,
                duration: first.durationRaw,
                channel: first.channel?.name,
                isAutoplay: false
            };
        }
    } catch (err) {
        console.warn('[Search] play-dl search failed, falling back to yt-dlp:', (err as any)?.message?.substring(0, 120));
    }

    // 2. Fallback to yt-dlp ytsearch1
    try {
        const data = await fetchYtDlpJson(`ytsearch1:${searchStr}`, { flatPlaylist: true });
        const entry = data?.entries?.[0] ?? data;
        return mapYtDlpEntryToQueueItem(entry, requestedBy, false);
    } catch (err) {
        console.error('[Search] yt-dlp search also failed:', (err as any)?.message?.substring(0, 200));
        return null;
    }
}

function destroyQueue(guildId: string) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue) return;

    if (serverQueue.leaveTimeout) {
        clearTimeout(serverQueue.leaveTimeout);
        serverQueue.leaveTimeout = undefined;
    }
    serverQueue.songs = [];
    queue.delete(guildId);

    try {
        serverQueue.player.stop(true);
    } catch {
        // Ignore stop errors during cleanup
    }
    try {
        serverQueue.connection.destroy();
    } catch {
        // Ignore destroy errors if already destroyed
    }
}

function advanceAndPlayNext(guildId: string) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue) return;

    if (serverQueue.isGoingBack) {
        serverQueue.isGoingBack = false;
        const previousSong = serverQueue.history.pop();
        if (previousSong) {
            serverQueue.songs.unshift(previousSong);
        }
    } else {
        const finishedSong = serverQueue.songs.shift();
        if (finishedSong) {
            if (serverQueue.loop && !serverQueue.lastSongErrored) {
                serverQueue.songs.unshift(finishedSong);
            } else {
                serverQueue.history.push(finishedSong);
                if (serverQueue.history.length > 50) serverQueue.history.shift();
            }
        }
    }

    serverQueue.lastSongErrored = false;
    void playNextSong(guildId);
}

function setupQueueEvents(guildId: string, serverQueue: ServerQueue) {
    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        if (!queue.has(guildId)) return;
        advanceAndPlayNext(guildId);
    });

    serverQueue.player.on('error', (error: any) => {
        console.error('Audio Player Error:', error);
        const currentQueue = queue.get(guildId);
        if (!currentQueue) return;

        currentQueue.lastSongErrored = true;
        // AudioPlayer automatically transitions to Idle after emitting 'error' while Playing/Buffering.
        // Only advance manually if the player was already Idle.
        if (currentQueue.player.state.status === AudioPlayerStatus.Idle) {
            advanceAndPlayNext(guildId);
        }
    });
}

export async function handleMusicCommand(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.guild) return false;

    const command = interaction.commandName;
    const serverQueue = queue.get(interaction.guild.id);

    if (command === 'play') {
        const query = interaction.options.getString('query', true);
        await interaction.deferReply();
        await executePlay(interaction, serverQueue, query);
        return true;
    } else if (command === 'skip') {
        if (!serverQueue || serverQueue.songs.length === 0) {
            await interaction.reply("There is no song playing that I could skip!");
            return true;
        }
        serverQueue.player.stop();
        await interaction.reply("⏭️ Skipped!");
        return true;
    } else if (command === 'stop') {
        if (!serverQueue) {
            await interaction.reply("There is no song that I could stop!");
            return true;
        }
        destroyQueue(interaction.guild.id);
        await interaction.reply("🛑 Stopped playing and left the channel.");
        return true;
    } else if (command === 'list') {
        if (!serverQueue || serverQueue.songs.length === 0) {
            await interaction.reply({ content: "The queue is currently empty!", ephemeral: true });
            return true;
        }

        const embed = getQueueEmbed(serverQueue, 0);
        const row = getQueuePaginationRow(0, serverQueue.songs.length);

        await interaction.reply({ embeds: [embed], components: [row] });
        return true;
    } else if (command === 'seek') {
        if (!serverQueue || serverQueue.songs.length === 0) {
            await interaction.reply("There is no song playing right now!");
            return true;
        }

        const currentSong = serverQueue.songs[0];

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: 'MUSIC PANEL' })
            .setDescription(`💿 [${currentSong.title}](${currentSong.url})\n\n👤 **Requested By**\n\`@${currentSong.requestedBy}\`\n\n⏱️ **Music Duration**\n\`${currentSong.duration || 'Unknown'}\`\n\n🎤 **Music Author**\n\`${currentSong.channel || 'Unknown'}\``);

        if (currentSong.thumbnail) {
            embed.setThumbnail(currentSong.thumbnail);
        }

        const rows = getDashboardRows(serverQueue);
        await interaction.reply({
            embeds: [embed],
            components: rows
        });
        return true;
    }

    return false;
}

async function executePlay(interaction: ChatInputCommandInteraction, serverQueue: ServerQueue | undefined, query: string) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.editReply("You need to be in a voice channel to play music!");
    }

    try {
        let songsToAdd: QueueItem[] = [];

        if (query.startsWith("http")) {
            if (query.includes('spotify.com')) {
                try {
                    await interaction.editReply("🎵 Loading from Spotify... This might take a moment as I search for the tracks.");
                    const sp_data = await play.spotify(query);

                    let tracksToSearch: string[] = [];
                    if (sp_data.type === 'track') {
                        const track = sp_data as any;
                        tracksToSearch.push(`${track.name} ${track.artists[0].name}`);
                    } else if (sp_data.type === 'playlist' || sp_data.type === 'album') {
                        const list = sp_data as any;
                        const tracks = await list.all_tracks();
                        for (const track of tracks) {
                            tracksToSearch.push(`${track.name} ${track.artists[0].name}`);
                        }
                    }

                    if (tracksToSearch.length === 0) {
                        return interaction.editReply("I couldn't find any tracks in that Spotify link.");
                    }

                    if (tracksToSearch.length > 30) {
                        await interaction.followUp(`⚠️ This playlist is quite large. I will only add the first 30 songs to keep things fast!`);
                        tracksToSearch = tracksToSearch.slice(0, 30);
                    }

                    for (const searchStr of tracksToSearch) {
                        const song = await searchYouTubeTrack(searchStr, interaction.user.username);
                        if (song) songsToAdd.push(song);
                    }
                } catch (err) {
                    console.error("Spotify error:", err);
                    return interaction.editReply("Sorry, I had trouble reading that Spotify link. Make sure it's valid or try another one!");
                }
            } else if (isYouTubePlaylistUrl(query)) {
                try {
                    await interaction.editReply("⏳ Loading playlist... This might take a moment.");
                    const data = await fetchYtDlpJson(query, { flatPlaylist: true });

                    if (!data || !data.entries || data.entries.length === 0) {
                        return interaction.editReply("I couldn't find any songs in that playlist.");
                    }

                    for (const entry of data.entries) {
                        const song = mapYtDlpEntryToQueueItem(entry, interaction.user.username, false);
                        if (song) songsToAdd.push(song);
                    }
                } catch (err) {
                    console.error("Playlist error:", err);
                    return interaction.editReply("There was an error loading the playlist.");
                }
            } else {
                // Single URL: try play-dl first, then fall back to yt-dlp metadata
                let loaded = false;
                try {
                    const data = await withTimeout(play.video_info(query), 8_000, 'play.video_info');
                    songsToAdd.push({
                        title: data.video_details.title || 'Unknown Title',
                        url: data.video_details.url,
                        requestedBy: interaction.user.username,
                        thumbnail: data.video_details.thumbnails[0]?.url,
                        duration: data.video_details.durationRaw,
                        channel: data.video_details.channel?.name
                    });
                    loaded = true;
                } catch (err) {
                    console.warn("[URL] play.video_info failed, trying yt-dlp fallback:", (err as any)?.message?.substring(0, 120));
                }

                if (!loaded) {
                    try {
                        const data = await fetchYtDlpJson(query, { noPlaylist: true });
                        const song = mapYtDlpEntryToQueueItem(data, interaction.user.username, false);
                        if (song) songsToAdd.push(song);
                    } catch (err) {
                        console.error("[URL] yt-dlp metadata fallback failed:", err);
                        return interaction.editReply("Sorry, I couldn't load that video URL.");
                    }
                }
            }
        } else {
            const song = await searchYouTubeTrack(query, interaction.user.username);
            if (!song) {
                return interaction.editReply("I couldn't find any results for that search.");
            }
            songsToAdd.push(song);
        }

        if (songsToAdd.length === 0) {
            return interaction.editReply("Oops, I couldn't extract any valid songs!");
        }

        const firstSong = songsToAdd[0];

        if (!serverQueue) {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild!.id,
                adapterCreator: interaction.guild!.voiceAdapterCreator as any
            });

            const queueConstruct: ServerQueue = {
                textChannelId: interaction.channelId,
                voiceChannelId: voiceChannel.id,
                connection,
                player: createAudioPlayer(),
                songs: [],
                history: [],
                playing: true,
                autoplay: false,
                loop: false,
                volume: 1.0,
                audioResource: null
            };

            setupQueueEvents(interaction.guild!.id, queueConstruct);
            queue.set(interaction.guild!.id, queueConstruct);
            queueConstruct.songs.push(...songsToAdd);

            try {
                connection.on('stateChange', (oldState, newState) => {
                    console.log(`[Voice] ${oldState.status} -> ${newState.status}`);
                });

                connection.on('error', (err) => {
                    console.error('[VoiceConnection Error]', err);
                });

                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                    } catch {
                        destroyQueue(interaction.guild!.id);
                    }
                });

                await interaction.editReply(`⏳ Found **${firstSong.title}** — connecting to voice and buffering audio...`);
                connection.subscribe(queueConstruct.player);
                await playNextSong(interaction.guild!.id);

                if (queueConstruct.songs.length === 0) {
                    return interaction.editReply("❌ Failed to play the requested track. YouTube may be blocking the stream right now.");
                }

                const embed = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setAuthor({ name: 'MUSIC PANEL' })
                    .setDescription(`💿 [${firstSong.title}](${firstSong.url})\n\n👤 **Requested By**\n\`@${firstSong.requestedBy}\`\n\n⏱️ **Music Duration**\n\`${firstSong.duration || 'Unknown'}\`\n\n🎤 **Music Author**\n\`${firstSong.channel || 'Unknown'}\``);

                if (firstSong.thumbnail) {
                    embed.setThumbnail(firstSong.thumbnail);
                }

                if (songsToAdd.length > 1) {
                    embed.setFooter({ text: `Added ${songsToAdd.length} songs to the queue from playlist!` });
                }

                const rows = getDashboardRows(queueConstruct);
                await interaction.editReply({
                    embeds: [embed],
                    components: rows
                });

                if (queueConstruct.autoplay) {
                    checkAndFetchAutoplay(queueConstruct);
                }
            } catch (err) {
                console.error(err);
                destroyQueue(interaction.guild!.id);
                return interaction.editReply("There was an error connecting to the voice channel!");
            }
        } else {
            if (serverQueue.autoplay && serverQueue.songs.length > 1) {
                const currentSong = serverQueue.songs[0];
                serverQueue.songs = [currentSong, ...serverQueue.songs.slice(1).filter(s => !s.isAutoplay)];
            }

            const wasEmpty = serverQueue.songs.length === 0;
            serverQueue.songs.push(...songsToAdd);

            if (wasEmpty) {
                if (serverQueue.leaveTimeout) {
                    clearTimeout(serverQueue.leaveTimeout);
                    serverQueue.leaveTimeout = undefined;
                }
                await playNextSong(interaction.guild!.id);
            }

            if (serverQueue.autoplay) {
                checkAndFetchAutoplay(serverQueue);
            }

            if (songsToAdd.length > 1) {
                return interaction.editReply(`✅ **${songsToAdd.length} songs** from the playlist have been added to the queue!`);
            } else {
                return interaction.editReply(`✅ **${firstSong.title}** has been added to the queue!`);
            }
        }
    } catch (error) {
        console.error("executePlay Error:", error);
        return interaction.editReply("There was an error trying to find or play that song.");
    }
}

function waitForReadableStream(source: Readable, onCleanup?: () => void, timeoutMs = 20_000): Promise<Readable> {
    return new Promise((resolve, reject) => {
        const output = new PassThrough({ highWaterMark: 256 * 1024 });
        let settled = false;

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                cleanupSource();
                reject(new Error(`Timed out waiting for audio stream (${timeoutMs}ms)`));
            }
        }, timeoutMs);

        const cleanupSource = () => {
            clearTimeout(timer);
            source.unpipe(output);
            if (!source.destroyed) source.destroy();
            if (!output.destroyed) output.destroy();
            onCleanup?.();
        };

        source.pipe(output);

        output.once('readable', () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(output);
        });

        output.on('close', () => {
            onCleanup?.();
        });

        source.on('error', (err) => {
            if (!settled) {
                settled = true;
                cleanupSource();
                reject(err);
            } else if (!output.destroyed) {
                output.destroy(err);
            }
        });

        source.once('end', () => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                reject(new Error('Stream ended before producing any audio data'));
            }
        });
    });
}

async function runYtDlpStream(url: string, useCookies: boolean): Promise<Readable> {
    const { binaryPath, isNightly } = await ensureYtDlp();

    const args = [
        '-o', '-',
        '-f', 'bestaudio/best',
        '--no-playlist',
        '--no-progress',
        '--no-warnings',
        '--force-ipv4',
        '--extractor-args',
        useCookies ? 'youtube:player_client=tv,web,mweb' : 'youtube:player_client=ios,android,tv',
        url
    ];

    if (isNightly) {
        args.splice(6, 0, '--js-runtimes', 'node');
    }
    if (useCookies && cookiesFilePath) {
        args.unshift('--cookies', cookiesFilePath);
    }

    const ytDlpProcess = spawn(binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });

    let errorData = '';
    ytDlpProcess.stderr.on('data', (data) => {
        const str = data.toString();
        errorData += str;
        if (errorData.length > 2000) {
            errorData = errorData.slice(-2000);
        }
        console.log(`[yt-dlp stderr] ${str.trim()}`);
    });

    const killProcess = () => {
        if (!ytDlpProcess.killed) {
            try {
                ytDlpProcess.kill('SIGTERM');
            } catch {
                // Ignore kill errors
            }
        }
    };

    return new Promise<Readable>((resolve, reject) => {
        const output = new PassThrough({ highWaterMark: 256 * 1024 });
        let settled = false;

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                killProcess();
                if (!output.destroyed) output.destroy();
                reject(new Error(`yt-dlp timed out waiting for audio data. Stderr: ${errorData.substring(0, 300)}`));
            }
        }, 25_000);

        ytDlpProcess.stdout.on('error', () => {});
        ytDlpProcess.stdout.pipe(output);

        output.once('readable', () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(output);
        });

        output.on('close', () => {
            killProcess();
        });

        ytDlpProcess.on('error', (err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                if (!output.destroyed) output.destroy();
                reject(err);
            } else if (!output.destroyed) {
                output.destroy(err);
            }
        });

        ytDlpProcess.on('close', (code) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                if (!output.destroyed) output.destroy();
                reject(new Error(`yt-dlp exited with code ${code} before producing audio. Stderr: ${errorData.substring(0, 300)}`));
            } else if (code !== 0 && !output.destroyed) {
                console.warn(`[yt-dlp] Exited mid-stream with code ${code}`);
            }
        });
    });
}

async function getAudioStream(url: string): Promise<{ stream: Readable }> {
    // Backend 1: yt-dlp with cookies (if configured)
    if (cookiesFilePath) {
        try {
            console.log('[Stream] Trying yt-dlp WITH cookies...');
            const stream = await runYtDlpStream(url, true);
            console.log('[Stream] ✅ yt-dlp (cookies) stream started');
            return { stream };
        } catch (err: any) {
            console.log('[Stream] ❌ yt-dlp WITH cookies failed:', err.message?.substring(0, 200));
        }
    }

    // Backend 2: yt-dlp without cookies (anonymous mobile/TV clients)
    try {
        console.log('[Stream] Trying yt-dlp WITHOUT cookies...');
        const stream = await runYtDlpStream(url, false);
        console.log('[Stream] ✅ yt-dlp (anonymous) stream started');
        return { stream };
    } catch (err: any) {
        console.log('[Stream] ❌ yt-dlp WITHOUT cookies failed:', err.message?.substring(0, 200));
    }

    // Backend 3: play-dl
    try {
        console.log('[Stream] Trying play-dl...');
        const playStream = await withTimeout(play.stream(url), 10_000, 'play.stream');
        const stream = await waitForReadableStream(playStream.stream as unknown as Readable);
        console.log('[Stream] ✅ play-dl stream started successfully');
        return { stream };
    } catch (err: any) {
        console.log('[Stream] ❌ play-dl failed:', err.message?.substring(0, 150));
    }

    // Backend 4: ytdl-core
    try {
        console.log('[Stream] Trying ytdl-core...');
        const rawStream = ytdl(url, {
            filter: 'audioonly',
            highWaterMark: 1 << 20,
            agent: ytdlAgent
        });
        const stream = await waitForReadableStream(rawStream);
        console.log('[Stream] ✅ ytdl-core stream started successfully');
        return { stream };
    } catch (err: any) {
        console.log('[Stream] ❌ ytdl-core failed:', err.message?.substring(0, 150));
    }

    throw new Error('All YouTube extractors failed to bypass bot protection.');
}

async function playNextSong(guildId: string) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue || serverQueue.isStartingTrack) return;

    serverQueue.isStartingTrack = true;
    try {
        while (serverQueue.songs.length > 0 || (serverQueue.autoplay && serverQueue.lastPlayedUrl)) {
            if (serverQueue.songs.length === 0) {
                try {
                    const nextSongs = await getAutoplaySongs(serverQueue.lastPlayedUrl!, 10);
                    if (nextSongs.length === 0) break;
                    serverQueue.songs.push(...nextSongs);
                } catch (err) {
                    console.error("Autoplay failed:", err);
                    destroyQueue(guildId);
                    return;
                }
            }

            const song = serverQueue.songs[0];
            serverQueue.lastPlayedUrl = song.url;
            serverQueue.lastSongErrored = false;

            try {
                await ensureFfmpeg();
                const streamResult = await getAudioStream(song.url);
                if (!queue.has(guildId)) {
                    streamResult.stream.destroy();
                    return;
                }

                const resource = createAudioResource(streamResult.stream, {
                    inlineVolume: true
                });
                if (resource.volume) {
                    resource.volume.setVolume(serverQueue.volume);
                }
                serverQueue.audioResource = resource;
                serverQueue.player.play(resource);

                checkAndFetchAutoplay(serverQueue);
                return;
            } catch (error) {
                console.error(`Error playing "${song.title}":`, error);
                serverQueue.songs.shift();
            }
        }

        // Queue is empty and no more songs to play: wait 60 seconds before leaving
        if (serverQueue.leaveTimeout) clearTimeout(serverQueue.leaveTimeout);
        serverQueue.leaveTimeout = setTimeout(() => {
            const currentQueue = queue.get(guildId);
            if (currentQueue && currentQueue.songs.length === 0) {
                destroyQueue(guildId);
            }
        }, 60_000);
    } finally {
        const currentQueue = queue.get(guildId);
        if (currentQueue) {
            currentQueue.isStartingTrack = false;
        }
    }
}

async function getAutoplaySongs(lastUrl: string, count: number = 10): Promise<QueueItem[]> {
    console.log(`[Autoplay] Fetching ${count} related songs for: ${lastUrl}`);
    const nextSongs: QueueItem[] = [];

    try {
        const videoId = extractYouTubeVideoId(lastUrl);
        if (!videoId) throw new Error('Could not extract video ID from URL');

        const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
        const data = await fetchYtDlpJson(mixUrl, { flatPlaylist: true });

        if (data && data.entries && data.entries.length > 0) {
            const entries = data.entries.filter((e: any) => e.id !== videoId).slice(0, count);
            for (const entry of entries) {
                const song = mapYtDlpEntryToQueueItem(entry, 'AutoPlay 🤖', true);
                if (song) nextSongs.push(song);
            }
        }
    } catch (err) {
        console.error('[Autoplay] yt-dlp mix fetch failed, trying search fallback:', err);
    }

    if (nextSongs.length === 0) {
        try {
            const searchResults = await play.search('music mix', { limit: count });
            for (const result of searchResults) {
                nextSongs.push({
                    title: result.title || 'AutoPlayed Song',
                    url: result.url,
                    requestedBy: 'AutoPlay 🤖',
                    thumbnail: result.thumbnails?.[0]?.url,
                    duration: result.durationRaw,
                    channel: result.channel?.name,
                    isAutoplay: true
                });
            }
        } catch (searchErr) {
            console.error('[Autoplay] Fallback search also failed:', searchErr);
        }
    }

    console.log(`[Autoplay] Found ${nextSongs.length} songs`);
    return nextSongs;
}

async function checkAndFetchAutoplay(serverQueue: ServerQueue) {
    if (!serverQueue.autoplay) return;

    const upcomingAutoplayCount = serverQueue.songs.slice(1).filter(s => s.isAutoplay).length;
    if (upcomingAutoplayCount >= 2) return;

    const lastUserSong = [...serverQueue.songs].reverse().find(s => !s.isAutoplay);
    const lastSong = serverQueue.songs.length > 0 ? serverQueue.songs[serverQueue.songs.length - 1] : null;
    const searchUrl = lastUserSong?.url || lastSong?.url || serverQueue.lastPlayedUrl;
    if (!searchUrl) return;

    if (serverQueue.isFetchingAutoplay) return;
    serverQueue.isFetchingAutoplay = true;

    try {
        const nextSongs = await getAutoplaySongs(searchUrl, 10);

        if (serverQueue.autoplay && nextSongs.length > 0) {
            serverQueue.songs.push(...nextSongs);
            console.log(`[Autoplay] Added ${nextSongs.length} songs to queue. Total: ${serverQueue.songs.length}`);
        }
    } catch (err) {
        console.error('Autoplay pre-fetch failed:', err);
    } finally {
        serverQueue.isFetchingAutoplay = false;
    }
}

function getDashboardRows(serverQueue: ServerQueue) {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('music_down').setLabel('🔉 Down').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_back').setLabel('⏮️ Back').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_playpause').setLabel('⏯️ Pause').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_skip').setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_up').setLabel('🔊 Up').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('music_shuffle').setLabel('🔀 Shuffle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_loop').setLabel(serverQueue.loop ? '🔁 Loop (ON)' : '🔁 Loop').setStyle(serverQueue.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_stop').setLabel('⏹️ Stop').setStyle(ButtonStyle.Primary)
    );

    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('music_autoplay').setLabel(serverQueue.autoplay ? '▶️ AutoPlay (ON)' : '▶️ AutoPlay').setStyle(serverQueue.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_queue').setLabel('📜 Playlist').setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3];
}

function getQueueEmbed(serverQueue: ServerQueue, page: number = 0) {
    const PAGE_SIZE = 10;
    const maxPage = Math.max(0, Math.ceil(serverQueue.songs.length / PAGE_SIZE) - 1);

    if (page < 0) page = 0;
    if (page > maxPage) page = maxPage;

    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const currentSongs = serverQueue.songs.slice(start, end);

    const queueString = currentSongs.map((song, index) => {
        const actualIndex = start + index;
        return `${actualIndex === 0 ? '**[Playing]**' : `**${actualIndex}.**`} [${song.title.substring(0, 50)}](${song.url}) - \`@${song.requestedBy}\``;
    }).join('\n');

    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`📜 Queue (Page ${page + 1}/${maxPage + 1})`)
        .setDescription(queueString || 'No songs in queue.')
        .setFooter({ text: `Total: ${serverQueue.songs.length} songs` });
}

function getQueuePaginationRow(page: number, totalSongs: number) {
    const PAGE_SIZE = 10;
    const maxPage = Math.max(0, Math.ceil(totalSongs / PAGE_SIZE) - 1);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`music_qprev_${page}`)
            .setLabel('◀️ Prev')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`music_qnext_${page}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= maxPage)
    );
}

export async function handleMusicInteraction(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('music_')) return;

    try {
        const serverQueue = queue.get(interaction.guildId!);
        if (!serverQueue) {
            return interaction.reply({ content: "There is no music playing right now!", ephemeral: true });
        }

        if (interaction.customId === 'music_playpause') {
            if (serverQueue.player.state.status === AudioPlayerStatus.Playing) {
                serverQueue.player.pause();
                await interaction.reply({ content: "⏸️ Paused the music.", ephemeral: false });
            } else {
                serverQueue.player.unpause();
                await interaction.reply({ content: "▶️ Resumed the music.", ephemeral: false });
            }
        } else if (interaction.customId === 'music_skip') {
            serverQueue.player.stop();
            await interaction.reply({ content: "⏭️ Skipped to the next song.", ephemeral: false });
        } else if (interaction.customId === 'music_stop') {
            destroyQueue(interaction.guildId!);
            await interaction.reply({ content: "🛑 Stopped playing and left the channel.", ephemeral: false });
        } else if (interaction.customId === 'music_queue') {
            if (serverQueue.songs.length === 0) {
                return interaction.reply({ content: "The queue is currently empty!", ephemeral: true });
            }
            const embed = getQueueEmbed(serverQueue, 0);
            const row = getQueuePaginationRow(0, serverQueue.songs.length);
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else if (interaction.customId.startsWith('music_qprev_') || interaction.customId.startsWith('music_qnext_')) {
            const isNext = interaction.customId.startsWith('music_qnext_');
            const currentPage = parseInt(interaction.customId.split('_').pop() || '0', 10);
            const targetPage = isNext ? currentPage + 1 : currentPage - 1;

            if (serverQueue.songs.length === 0) {
                return interaction.update({ content: "The queue is currently empty!", embeds: [], components: [] });
            }

            const embed = getQueueEmbed(serverQueue, targetPage);
            const row = getQueuePaginationRow(targetPage, serverQueue.songs.length);

            await interaction.update({ embeds: [embed], components: [row] });
        } else if (interaction.customId === 'music_loop') {
            serverQueue.loop = !serverQueue.loop;
            const rows = getDashboardRows(serverQueue);
            await interaction.update({ components: rows });
        } else if (interaction.customId === 'music_autoplay') {
            serverQueue.autoplay = !serverQueue.autoplay;
            const rows = getDashboardRows(serverQueue);
            await interaction.update({ components: rows });

            if (serverQueue.autoplay) {
                checkAndFetchAutoplay(serverQueue);
            }
        } else if (interaction.customId === 'music_up') {
            if (serverQueue.volume < 2.0) {
                serverQueue.volume = Math.min(2.0, serverQueue.volume + 0.2);
                if (serverQueue.audioResource?.volume) {
                    serverQueue.audioResource.volume.setVolume(serverQueue.volume);
                }
                await interaction.reply({ content: `🔊 Volume set to ${Math.round(serverQueue.volume * 100)}%`, ephemeral: true });
            } else {
                await interaction.reply({ content: `🔊 Volume is already at maximum (200%)!`, ephemeral: true });
            }
        } else if (interaction.customId === 'music_down') {
            if (serverQueue.volume > 0.1) {
                serverQueue.volume = Math.max(0.1, serverQueue.volume - 0.2);
                if (serverQueue.audioResource?.volume) {
                    serverQueue.audioResource.volume.setVolume(serverQueue.volume);
                }
                await interaction.reply({ content: `🔉 Volume set to ${Math.round(serverQueue.volume * 100)}%`, ephemeral: true });
            } else {
                await interaction.reply({ content: `🔉 Volume is already at minimum (10%)!`, ephemeral: true });
            }
        } else if (interaction.customId === 'music_back') {
            if (serverQueue.history.length === 0) {
                return interaction.reply({ content: "No previous song in history!", ephemeral: true });
            }
            serverQueue.isGoingBack = true;
            serverQueue.player.stop();
            await interaction.reply({ content: "⏮️ Playing the previous song.", ephemeral: false });
        } else if (interaction.customId === 'music_shuffle') {
            if (serverQueue.songs.length <= 2) {
                return interaction.reply({ content: "Not enough songs in the queue to shuffle!", ephemeral: true });
            }
            const queueToShuffle = serverQueue.songs.slice(1);
            for (let i = queueToShuffle.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queueToShuffle[i], queueToShuffle[j]] = [queueToShuffle[j], queueToShuffle[i]];
            }
            serverQueue.songs = [serverQueue.songs[0], ...queueToShuffle];
            await interaction.reply({ content: "🔀 Queue has been shuffled!", ephemeral: false });
        } else {
            await interaction.reply({ content: "✨ Fitur ini masih dalam tahap pengembangan (Segera hadir)!", ephemeral: true });
        }
    } catch (error) {
        console.error("Error in handleMusicInteraction:", error);
    }
}
