// Potentnial package for searching for youtube video with keywords: https://www.npmjs.com/package/youtube-search-api
// Potential package for writing metadata: https://www.npmjs.com/package/ffmetadata

import youtubedl from 'youtube-dl-exec';
import type { RequestHandler } from './$types';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { unlink, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import os from 'os';

process.env.FFMPEG_PATH = ffmpegInstaller.path;

export const POST: RequestHandler = async ({ request }) => {
    const tempFile = path.join(os.tmpdir(), `${randomUUID()}.mp3`);

    try {
        const { url } = await request.json() as { url: string };

        await youtubedl(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: tempFile,
            ffmpegLocation: ffmpegInstaller.path
        });

        // 
        const buffer = await readFile(tempFile);
        await unlink(tempFile);

        return new Response(buffer,
            {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': buffer.length.toString()
                }
            });
    } catch (error) {
        // Attempt to clean up temporary file if it still exists in the case of an error
        try {
            await unlink(tempFile);
        } catch { }

        const message = error instanceof Error ? error.message : 'Unknown Error';
        return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
} 