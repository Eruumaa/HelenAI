import { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus, 
    entersState 
} from '@discordjs/voice';
import play from 'play-dl';
import ytDlp from 'yt-dlp-exec';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import path from 'path';
// autoplay logic is handled inline in getAutoplaySongs below
import { 
    Message, 
    GuildMember, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ButtonInteraction,
    EmbedBuilder,
    ChatInputCommandInteraction
} from 'discord.js';

let ytdlAgent: ytdl.Agent | undefined;
let cookiesFilePath: string | undefined;

if (process.env.YOUTUBE_COOKIES) {
    try {
        const cookies = JSON.parse(process.env.YOUTUBE_COOKIES);
        ytdlAgent = ytdl.createAgent(cookies);
        console.log("YouTube Cookies successfully loaded for ytdl-core!");
        
        // Convert to Netscape format for yt-dlp
        let netscape = "# Netscape HTTP Cookie File\n";
        for (const cookie of cookies) {
            const domain = cookie.domain || '';
            const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
            const pathUrl = cookie.path || '/';
            const secure = cookie.secure ? 'TRUE' : 'FALSE';
            const expiration = cookie.expirationDate ? Math.round(cookie.expirationDate) : 0;
            netscape += `${domain}\t${includeSubdomains}\t${pathUrl}\t${secure}\t${expiration}\t${cookie.name}\t${cookie.value}\n`;
        }
        
        cookiesFilePath = path.join(process.cwd(), 'youtube-cookies.txt');
        fs.writeFileSync(cookiesFilePath, netscape);
        console.log("YouTube cookies written to youtube-cookies.txt for yt-dlp!");
        
    } catch (e) {
        console.error("Failed to parse YOUTUBE_COOKIES (make sure it's a valid JSON array):", e);
    }
}

if (process.env.YOUTUBE_COOKIE) {
    play.setToken({
        youtube: {
            cookie: process.env.YOUTUBE_COOKIE
        }
    });
}

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
    connection: any;
    player: any;
    songs: QueueItem[];
    history: QueueItem[];
    playing: boolean;
    autoplay: boolean;
    loop: boolean;
    volume: number;
    audioResource: any;
    lastPlayedUrl?: string;
    isGoingBack?: boolean;
    isFetchingAutoplay?: boolean;
    leaveTimeout?: NodeJS.Timeout;
}

const queue = new Map<string, ServerQueue>();

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
        if (!serverQueue) {
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
        serverQueue.songs = [];
        serverQueue.player.stop();
        serverQueue.connection.destroy();
        queue.delete(interaction.guild.id);
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
                        try {
                            const searchResults = await play.search(searchStr, { limit: 1 });
                            if (searchResults && searchResults.length > 0) {
                                songsToAdd.push({
                                    title: searchResults[0].title || "Unknown Title",
                                    url: searchResults[0].url,
                                    requestedBy: interaction.user.username,
                                    thumbnail: searchResults[0].thumbnails[0]?.url,
                                    duration: searchResults[0].durationRaw,
                                    channel: searchResults[0].channel?.name,
                                    isAutoplay: false
                                });
                            }
                        } catch(e) {
                            console.error("Failed to search track from spotify:", searchStr);
                        }
                    }
                } catch (err) {
                    console.error("Spotify error:", err);
                    return interaction.editReply("Sorry, I had trouble reading that Spotify link. Make sure it's valid or try another one!");
                }
            } else if (query.includes('playlist?list=')) {
                try {
                    await interaction.editReply("⏳ Loading playlist... This might take a moment.");
                    const data: any = await (ytDlp as any)(query, {
                        dumpSingleJson: true,
                        flatPlaylist: true,
                        'extractor-args': 'youtube:player_client=android'
                    });
                    
                    if (!data || !data.entries || data.entries.length === 0) {
                        return interaction.editReply("I couldn't find any songs in that playlist.");
                    }
                    
                    for (const entry of data.entries) {
                        if (!entry.url) continue;
                        songsToAdd.push({
                            title: entry.title || "Unknown Title",
                            url: entry.url,
                            requestedBy: interaction.user.username,
                            thumbnail: entry.thumbnails?.[0]?.url,
                            duration: entry.duration ? String(Math.floor(entry.duration / 60)) + ":" + String(Math.floor(entry.duration % 60)).padStart(2, '0') : "0:00",
                            channel: entry.uploader || entry.channel
                        });
                    }
                } catch (err) {
                    console.error("Playlist error:", err);
                    return interaction.editReply("There was an error loading the playlist.");
                }
            } else {
                try {
                    const data = await play.video_info(query);
                    songsToAdd.push({
                        title: data.video_details.title,
                        url: data.video_details.url,
                        requestedBy: interaction.user.username,
                        thumbnail: data.video_details.thumbnails[0]?.url,
                        duration: data.video_details.durationRaw,
                        channel: data.video_details.channel?.name
                    });
                } catch (err) {
                    return interaction.editReply("Sorry, I couldn't load that YouTube video.");
                }
            }
        } else {
            const searchResults = await play.search(query, { limit: 1 });
            if (!searchResults || searchResults.length === 0) {
                return interaction.editReply("I couldn't find any results for that search.");
            }
            songsToAdd.push({
                title: searchResults[0].title,
                url: searchResults[0].url,
                requestedBy: interaction.user.username,
                thumbnail: searchResults[0].thumbnails[0]?.url,
                duration: searchResults[0].durationRaw,
                channel: searchResults[0].channel?.name,
                isAutoplay: false
            });
        }

        if (songsToAdd.length === 0) {
            return interaction.editReply("Oops, I couldn't extract any valid songs!");
        }

        const firstSong = songsToAdd[0];



        if (!serverQueue) {
            const queueConstruct: ServerQueue = {
                textChannelId: interaction.channelId,
                voiceChannelId: voiceChannel.id,
                connection: null,
                player: createAudioPlayer(),
                songs: [],
                history: [],
                playing: true,
                autoplay: false,
                loop: false,
                volume: 1.0,
                audioResource: null
            };

            queue.set(interaction.guild!.id, queueConstruct);
            queueConstruct.songs.push(...songsToAdd);

            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild!.id,
                    adapterCreator: interaction.guild!.voiceAdapterCreator as any
                });

                queueConstruct.connection = connection;
                
                connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 20_000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 20_000),
                        ]);
                    } catch (error) {
                        connection.destroy();
                        queue.delete(interaction.guild!.id);
                    }
                });

                connection.subscribe(queueConstruct.player);
                await playNextSong(interaction.guild!.id);
                
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
                interaction.editReply({ 
                    embeds: [embed], 
                    components: rows 
                });
                
                // If autoplay is on, fetch the next song
                if (queueConstruct.autoplay) {
                    checkAndFetchAutoplay(queueConstruct);
                }
            } catch (err) {
                console.error(err);
                queue.delete(interaction.guild!.id);
                return interaction.editReply("There was an error connecting to the voice channel!");
            }
        } else {
            // Remove any upcoming autoplay songs from the queue (keep the currently playing song at index 0 even if it's autoplay)
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
                playNextSong(interaction.guild!.id);
            }

            // Re-trigger autoplay fetch based on the newly added songs
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

async function playNextSong(guildId: string) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue) return;

    if (serverQueue.songs.length === 0) {
        if (serverQueue.autoplay && serverQueue.lastPlayedUrl) {
            try {
                // If queue is completely empty but autoplay is on, fetch next batch
                const nextSongs = await getAutoplaySongs(serverQueue.lastPlayedUrl, 10);
                serverQueue.songs.push(...nextSongs);
            } catch (err) {
                console.error("Autoplay failed:", err);
                serverQueue.connection.destroy();
                queue.delete(guildId);
                return;
            }
        } else {
            // Wait 60 seconds before leaving
            if (serverQueue.leaveTimeout) clearTimeout(serverQueue.leaveTimeout);
            serverQueue.leaveTimeout = setTimeout(() => {
                const currentQueue = queue.get(guildId);
                if (currentQueue && currentQueue.songs.length === 0) {
                    currentQueue.connection.destroy();
                    queue.delete(guildId);
                }
            }, 60_000);
            return;
        }
    }

    const song = serverQueue.songs[0];
    serverQueue.lastPlayedUrl = song.url;
    
    try {
        // Use yt-dlp-exec for streaming as ytdl-core is currently broken by YouTube player updates
        const ytDlpArgs: any = {
            output: '-',
            format: 'bestaudio',
            'no-warnings': true,
            'js-runtimes': 'node'
        };
        
        if (cookiesFilePath) {
            ytDlpArgs.cookies = cookiesFilePath;
        }

        const stream = (ytDlp as any).exec(song.url, ytDlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
        
        // Log stderr for debugging but don't crash
        stream.stderr?.on('data', (chunk: Buffer) => {
            const msg = chunk.toString().trim();
            if (msg && !msg.startsWith('[download]')) console.log('[yt-dlp]', msg);
        });
        
        if (!stream.stdout) {
            throw new Error("yt-dlp did not return a stream");
        }

        const resource = createAudioResource(stream.stdout, { inlineVolume: true });
        if (resource.volume) {
            resource.volume.setVolume(serverQueue.volume);
        }
        serverQueue.audioResource = resource;

        serverQueue.player.play(resource);
        
        // Asynchronously pre-fetch next song if autoplay is on
        checkAndFetchAutoplay(serverQueue);

        // We use once so it only triggers for THIS specific song playing
        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            if (serverQueue.isGoingBack) {
                serverQueue.isGoingBack = false;
                const previousSong = serverQueue.history.pop();
                if (previousSong) {
                    serverQueue.songs.unshift(previousSong);
                }
            } else {
                const finishedSong = serverQueue.songs.shift(); // Remove the finished song
                if (finishedSong) {
                    if (serverQueue.loop) {
                        serverQueue.songs.unshift(finishedSong); // Put it back at the front for single-song loop
                    } else {
                        serverQueue.history.push(finishedSong);
                        if (serverQueue.history.length > 50) serverQueue.history.shift();
                    }
                }
            }
            playNextSong(guildId);
        });

        serverQueue.player.once('error', (error: any) => {
            console.error('Audio Player Error:', error);
            serverQueue.songs.shift();
            playNextSong(guildId);
        });
    } catch (error) {
        console.error("Error playing next song:", error);
        serverQueue.songs.shift();
        playNextSong(guildId);
    }
}

async function getAutoplaySongs(lastUrl: string, count: number = 10): Promise<QueueItem[]> {
    console.log(`[Autoplay] Fetching ${count} related songs for: ${lastUrl}`);
    const nextSongs: QueueItem[] = [];

    try {
        // Use yt-dlp to get video info + related videos in one shot
        const ytDlpInfoArgs: any = {
            dumpSingleJson: true,
            flatPlaylist: true,
            'no-warnings': true,
            'js-runtimes': 'node',
            'extractor-args': 'youtube:player_client=android'
        };
        if (cookiesFilePath) ytDlpInfoArgs.cookies = cookiesFilePath;

        // Get the YouTube Mix (auto-generated playlist) for this video
        // YouTube creates a "Radio" mix playlist for every video
        const videoId = lastUrl.match(/[?&]v=([^&]+)/)?.[1];
        if (!videoId) throw new Error('Could not extract video ID from URL');

        const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
        
        const data: any = await (ytDlp as any)(mixUrl, ytDlpInfoArgs);

        if (data && data.entries && data.entries.length > 0) {
            // Skip the first entry (it's the current song itself)
            const entries = data.entries.filter((e: any) => e.id !== videoId).slice(0, count);
            for (const entry of entries) {
                nextSongs.push({
                    title: entry.title || 'AutoPlayed Song',
                    url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
                    requestedBy: 'AutoPlay 🤖',
                    thumbnail: entry.thumbnails?.[entry.thumbnails.length - 1]?.url,
                    duration: entry.duration ? `${Math.floor(entry.duration / 60)}:${String(Math.floor(entry.duration % 60)).padStart(2, '0')}` : undefined,
                    channel: entry.uploader || entry.channel,
                    isAutoplay: true
                });
            }
        }
    } catch (err) {
        console.error('[Autoplay] yt-dlp mix fetch failed, trying search fallback:', err);
    }

    // Fallback: if yt-dlp mix didn't work, use play-dl search
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
    
    // Check how many autoplay songs are upcoming (excluding currently playing song at index 0)
    const upcomingAutoplayCount = serverQueue.songs.slice(1).filter(s => s.isAutoplay).length;
    
    // Only fetch if we have less than 2 autoplay songs upcoming
    if (upcomingAutoplayCount >= 2) return;
    
    // Use the last user-added song (non-autoplay) for better recommendations,
    // falling back to the last song in queue, then the last played URL
    const lastUserSong = [...serverQueue.songs].reverse().find(s => !s.isAutoplay);
    const lastSong = serverQueue.songs.length > 0 ? serverQueue.songs[serverQueue.songs.length - 1] : null;
    const searchUrl = lastUserSong?.url || lastSong?.url || serverQueue.lastPlayedUrl;
    if (!searchUrl) return;
    
    // Prevent fetching multiple times if it's already fetching
    if (serverQueue.isFetchingAutoplay) return;
    serverQueue.isFetchingAutoplay = true;

    try {
        const nextSongs = await getAutoplaySongs(searchUrl, 10);
        
        // Recheck just in case the state changed while fetching (e.g. user turned off autoplay)
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
            serverQueue.player.stop(); // triggers Idle and plays next
            await interaction.reply({ content: "⏭️ Skipped to the next song.", ephemeral: false });
        } else if (interaction.customId === 'music_stop') {
            serverQueue.songs = [];
            if (serverQueue.leaveTimeout) clearTimeout(serverQueue.leaveTimeout);
            serverQueue.player.stop();
            serverQueue.connection.destroy();
            queue.delete(interaction.guildId!);
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
            const currentPage = parseInt(interaction.customId.split('_').pop() || '0');
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
            
            // If turned on, pre-fetch immediately
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
            // Shuffle from index 1 to the end (keep index 0 playing)
            const queueToShuffle = serverQueue.songs.slice(1);
            for (let i = queueToShuffle.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queueToShuffle[i], queueToShuffle[j]] = [queueToShuffle[j], queueToShuffle[i]];
            }
            serverQueue.songs = [serverQueue.songs[0], ...queueToShuffle];
            await interaction.reply({ content: "🔀 Queue has been shuffled!", ephemeral: false });
        } else {
            // Placeholder for the buttons that are not implemented yet
            await interaction.reply({ content: "✨ Fitur ini masih dalam tahap pengembangan (Segera hadir)!", ephemeral: true });
        }
    } catch (error) {
        console.error("Error in handleMusicInteraction:", error);
    }
}
