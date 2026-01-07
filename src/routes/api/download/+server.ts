// Potentnial package for searching for youtube video with keywords: https://www.npmjs.com/package/youtube-search-api
// Potential package for writing metadata: https://www.npmjs.com/package/ffmetadata

import youtubedl from 'youtube-dl-exec';
import type { RequestHandler } from './$types';
import { unlink, readFile, mkdir, rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import { writeTrackMetadata, fetchCoverImage } from '$lib/api/metadata';
import type { Album } from '$lib/classes/Album.svelte';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

// 
const downloads = new Map<string, {
    downloadCount: number,
    total: number,
    status: string,
    currentTrack?: string;
    error?: string;
    zipPath?: string;
    filename?: string;
    done: boolean;
}>();

async function downloadAlbum(downloadID: string, album: Album, audioQuality: number) {
    const tempDir = path.join(os.tmpdir(), `album-${downloadID}`);
    const zipPath = path.join(os.tmpdir(), `album-${downloadID}.zip`);

    try {
        // 
        downloads.set(downloadID, {
            downloadCount: 0,
            total: album.tracklist.length,
            status: "Starting download...",
            done: false
        });

        await mkdir(tempDir, { recursive: true });

        let downloadCount = 0;

        const cover: Buffer | null = await fetchCoverImage(album.coverURL);

        // 
        for (const track of album.tracklist) {
            // Use 'Unnamed Track' on UI side if no track name was given
            const trackName = track.name ?? 'Unnamed Track';

            downloads.set(downloadID, {
                downloadCount: downloadCount,
                total: album.tracklist.length,
                status: `Downloading: ${trackName}`,
                currentTrack: trackName,
                done: false
            });

            const cleanTitle = trackName.replace(/[<>:"/\\|?*]/g, '');
            const filename = `${String(track.number).padStart(2, '0')} ${cleanTitle}.mp3`;
            const filepath = path.join(tempDir, filename);

            // Skip track if no video is provided for it
            if (!track.videoURL) {
                downloads.set(downloadID, {
                    downloadCount: downloadCount,
                    total: album.tracklist.length,
                    status: `Skipping ${trackName} - No Video URL Provided.`,
                    currentTrack: trackName,
                    done: false
                });

                continue;
            }

            await youtubedl(track.videoURL, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 10 - audioQuality,
                output: filepath,
                embedThumbnail: false
            });

            // 
            writeTrackMetadata(filepath, track, album, cover);

            // 
            downloadCount++;

            // 
            downloads.set(downloadID, {
                downloadCount: downloadCount,
                total: album.tracklist.length,
                status: `Downloaded: ${trackName}!`,
                currentTrack: trackName,
                done: false
            });
        }

        // Create ZIP folder
        downloads.set(downloadID, {
            downloadCount: downloadCount,
            total: album.tracklist.length,
            status: 'Creating ZIP file...',
            done: false
        });

        const albumName = album.name ?? 'Unnamed Album';
        const albumArtist = album.artist ?? 'Unknown Artist';

        await new Promise<void>((resolve, reject) => {
            const output = createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve());
            archive.on('error', (err: Error) => {
                console.error('Archive ERROR', err);
                reject(err)
            });

            archive.pipe(output);

            archive.directory(tempDir, `${albumName} - ${albumArtist}`);

            archive.finalize();
        });

        // 
        await rm(tempDir, { recursive: true, force: true });

        // 
        const zipFilename = `${albumName} - ${albumArtist}.zip`.replace(/[<>:"/\\|?*]/g, '');

        // 
        downloads.set(downloadID, {
            downloadCount: downloadCount,
            total: album.tracklist.length,
            status: 'Ready for download!',
            done: true,
            zipPath: zipPath,
            filename: zipFilename
        });
    } catch (error) {
        console.error('Download ERROR:', error);
        downloads.set(downloadID, {
            downloadCount: 0,
            total: album.tracklist.length,
            status: 'Error occurred',
            error: error instanceof Error ? error.message : 'Unknown error',
            done: false
        });

        // Clean up if error occurs
        try {
            await rm(tempDir, { recursive: true, force: true });
            await unlink(zipPath);
        } catch (err) { console.error("ERROR while cleaning up in downloadAlbum():", err); }
    }

}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { album, audioQuality } = await request.json() as { album: Album, audioQuality: number };

        const downloadID = randomUUID();

        // 
        downloadAlbum(downloadID, album, audioQuality);
        return json({ downloadID, message: 'Download started.' })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error.';
        return json({ error: message }, { status: 500 });
    }
}

export const GET: RequestHandler = async ({ url }) => {
    const downloadID: string = url.searchParams.get('id') || '';
    const isStatusCheck: boolean = url.searchParams.get('isStatusCheck') === 'true';  // If not a status check, it is a download request

    if (!downloadID) return json({ error: 'Download ID missing.' }, { status: 400 });

    const download = downloads.get(downloadID);
    if (!download) return json({ error: "Download not found." }, { status: 404 });

    if (isStatusCheck) {
        return json({
            downloadCount: download.downloadCount,
            total: download.total,
            status: download.status,
            currentTrack: download.currentTrack,
            error: download.error,
            done: download.done
        });
    }

    if (!isStatusCheck && download.done && download.zipPath) {
        try {
            const zipBuffer = await readFile(download.zipPath);

            // Clean up temp ZIP file after reading it
            await unlink(download.zipPath);
            downloads.delete(downloadID);

            // 
            return new Response(zipBuffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${download.filename}"`,
                    'Content-Length': String(zipBuffer.length)
                }
            })
        } catch (err) {
            return json({ error: `Failed to download file. ERROR: ${err}` }, { status: 500 });
        }
    }

    return json({ error: 'Invalid action.' }, { status: 400 });
}
