import play from 'play-dl';

async function run() {
    try {
        console.log("Fetching video info...");
        const data = await play.video_info("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        console.log(`Found ${data.related_videos.length} related videos.`);
        for (let i = 0; i < Math.min(5, data.related_videos.length); i++) {
            const related = data.related_videos[i];
            const id = typeof related === 'string' ? related : (related as any).id;
            console.log(`- ID: ${id}`);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
