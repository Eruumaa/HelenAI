import ytDlp from 'yt-dlp-exec';
import { createAudioResource } from '@discordjs/voice';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

async function run() {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    // Build cookies file if available
    let cookiesFile: string | undefined;
    if (process.env.YOUTUBE_COOKIES) {
        const cookies = JSON.parse(process.env.YOUTUBE_COOKIES);
        let netscape = "# Netscape HTTP Cookie File\n";
        for (const c of cookies) {
            netscape += `${c.domain}\t${c.domain?.startsWith('.') ? 'TRUE' : 'FALSE'}\t${c.path || '/'}\t${c.secure ? 'TRUE' : 'FALSE'}\t${Math.round(c.expirationDate || 0)}\t${c.name}\t${c.value}\n`;
        }
        cookiesFile = path.join(process.cwd(), 'test-cookies.txt');
        fs.writeFileSync(cookiesFile, netscape);
        console.log("✅ Cookies file written");
    } else {
        console.log("⚠️ No YOUTUBE_COOKIES in env");
    }

    console.log("\n--- Test: yt-dlp-exec with stderr capture ---");
    const args: any = {
        output: '-',
        format: 'bestaudio',
        limitRate: '100K'
    };
    if (cookiesFile) args.cookies = cookiesFile;

    // Capture stderr too so we can see errors
    const proc = (ytDlp as any).exec(url, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderrData = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
        stderrData += chunk.toString();
    });

    let bytesReceived = 0;
    proc.stdout?.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
        if (bytesReceived <= chunk.length) {
            console.log(`✅ First data chunk received! (${chunk.length} bytes)`);
        }
    });

    proc.on('exit', (code: number) => {
        console.log(`\nyt-dlp exited with code: ${code}`);
        console.log(`Total bytes received: ${bytesReceived}`);
        if (stderrData) {
            console.log(`\nSTDERR output:\n${stderrData}`);
        }
        if (bytesReceived > 0) {
            console.log("\n🎉 SUCCESS - yt-dlp can stream audio!");
        } else {
            console.log("\n❌ FAIL - No audio data received");
        }
        process.exit(code || 0);
    });

    // Timeout after 15s
    setTimeout(() => {
        console.log(`\n⏱️ Timeout after 15s. Bytes received so far: ${bytesReceived}`);
        proc.kill?.();
        process.exit(1);
    }, 15000);
}
run();
