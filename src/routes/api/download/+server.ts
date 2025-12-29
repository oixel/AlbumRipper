// Potentnial package for searching for youtube video with keywords: https://www.npmjs.com/package/youtube-search-api
// Potential package for writing metadata: https://www.npmjs.com/package/ffmetadata

import youtubedl from 'youtube-dl-exec';
import type { RequestHandler } from './$types';
import { unlink, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import os from 'os';
import { getMetadata, writeMetadata } from '$lib/api/metadata';

async function downloadMP3(url: string) {
    // Store audio data into a temporary file so it can be return to user as a data buffer
    const tempFile = path.join(os.tmpdir(), `${randomUUID()}.mp3`);

    try {
        // Download audio from video at given URL
        await youtubedl(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: tempFile
        });

        // Grab metadata from the YouTube video
        const metadata = await getMetadata(url);

        // Write it to the file properly grabbed
        if (metadata) await writeMetadata(metadata, tempFile);
        else console.error('Failed to get metadata on URL:', url);

        // Convert audio data from youtubedl into a data buffer and delete temporary file
        const buffer = await readFile(tempFile);
        await unlink(tempFile);

        // Determine filename based on
        console.log("Track number is", metadata?.trackNumber);
        const filename = metadata ? `${metadata.trackNumber ? metadata.trackNumber.toString() + ' - ' : ''}${metadata.track}.mp3"` : "song.mp3";

        // Return the new data buffer to the requesting page to download its content
        return new Response(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${filename}`,
                'File-Name': filename,
                'Content-Length': buffer.length.toString()
            }
        });
    } catch (error) {
        // Delete tempFile in case of an error
        try {
            await unlink(tempFile);
        } catch { }

        const message = error instanceof Error ? error.message : 'Unknown ERROR';

        // Return ERROR data with message
        return new Response(JSON.stringify({ error: message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
    }
}

export const POST: RequestHandler = async ({ request }) => {
    const { url } = await request.json() as { url: string };
    return await downloadMP3(url);
}