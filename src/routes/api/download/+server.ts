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

// async function downloadMP3(url: string) {
//     // Store audio data into a temporary file so it can be return to user as a data buffer
//     const tempFile = path.join(os.tmpdir(), `${randomUUID()}.mp3`);

//     try {
//         // Download audio from video at given URL
//         await youtubedl(url, {
//             extractAudio: true,
//             audioFormat: 'mp3',
//             audioQuality: 0,
//             output: tempFile
//         });

//         // Grab metadata from the YouTube video
//         const metadata = await getMetadata(url);

//         // Write it to the file properly grabbed
//         if (metadata) await writeMetadata(metadata, tempFile);
//         else console.error('Failed to get metadata on URL:', url);

//         // Convert audio data from youtubedl into a data buffer and delete temporary file
//         const buffer = await readFile(tempFile);
//         await unlink(tempFile);

//         // Determine filename based on
//         console.log("Track number is", metadata?.trackNumber);
//         const filename = metadata ? `${metadata.trackNumber ? metadata.trackNumber.toString() + ' - ' : ''}${metadata.track}.mp3"` : "song.mp3";

//         // Return the new data buffer to the requesting page to download its content
//         return new Response(buffer, {
//             headers: {
//                 'Content-Type': 'audio/mpeg',
//                 'Content-Disposition': `attachment; filename="${filename}`,
//                 'File-Name': filename,
//                 'Content-Length': buffer.length.toString()
//             }
//         });
//     } catch (error) {
//         // Delete tempFile in case of an error
//         try {
//             await unlink(tempFile);
//         } catch {
//             console.log("ERROR while unlinking temporary file.")
//         }

//         const message = error instanceof Error ? error.message : 'Unknown ERROR';

//         // Return ERROR data with message
//         return new Response(JSON.stringify({ error: message }),
//             {
//                 status: 500,
//                 headers: { 'Content-Type': 'application/json' }
//             });
//     }
// }

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

async function downloadAlbum(downloadID: string, album: Album) {
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
            downloads.set(downloadID, {
                downloadCount: downloadCount,
                total: album.tracklist.length,
                status: `Downloading: ${track.name}`,
                currentTrack: track.name,
                done: false
            });

            const cleanTitle = track.name.replace(/[<>:"/\\|?*]/g, '');
            const filename = `${String(track.number).padStart(2, '0')} ${cleanTitle}.mp3`;
            const filepath = path.join(tempDir, filename);

            // 
            await youtubedl(track.videoURL, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0,
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
                status: `Completed: ${track.name}!`,
                currentTrack: track.name,
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

        await new Promise<void>((resolve, reject) => {
            const output = createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve());
            archive.on('error', (err: Error) => {
                console.error('Archive ERROR', err);
                reject(err)
            });

            archive.pipe(output);

            archive.directory(tempDir, `${album.name} - ${album.artist}`);

            archive.finalize();
        });

        // 
        await rm(tempDir, { recursive: true, force: true });

        // 
        const zipFilename = `${album.name} - ${album.artist}.zip`.replace(/[<>:"/\\|?*]/g, '');

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
    // OG download from YouTube approach
    // const { url } = await request.json() as { url: string };
    // return await downloadMP3(url);

    try {
        const { album } = await request.json() as { album: Album };

        const downloadID = randomUUID();

        // 
        downloadAlbum(downloadID, album);
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
