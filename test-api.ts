import ytDlp from 'yt-dlp-exec';

async function run() {
    const url = "https://music.youtube.com/playlist?list=OLAK5uy_n7Ig_LAUbKE6_ZeQ1pwHmJcEhwX7BekBo";
    try {
        console.log("Fetching playlist with yt-dlp...");
        const data: any = await (ytDlp as any)(url, {
            dumpSingleJson: true,
            flatPlaylist: true
        });
        
        console.log("Keys in data:", Object.keys(data));
        if (data.entries) {
            console.log(`Found ${data.entries.length} videos`);
        } else if (data.url) {
            console.log("Found single video:", data.title);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
