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

// Tracks the active download progress
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
        // Update download state to indicate initialization
        downloads.set(downloadID, {
            downloadCount: 0,
            total: album.tracklist.length,
            status: "Starting download...",
            done: false
        });

        await mkdir(tempDir, { recursive: true });

        let downloadCount = 0;

        const cover: Buffer | null = await fetchCoverImage(album.coverURL);

        // Download every track in the Album's tracklist
        for (const track of album.tracklist) {
            // Use 'Unnamed Track' on UI side if no track name was given
            const trackName = track.name.length ? track.name : 'Unnamed Track';

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

            // Write the track's metadata to the file contents
            writeTrackMetadata(filepath, track, album, cover);

            downloadCount++;

            // Update status to reflect successful track download
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

        const albumName = album.name.length ? album.name : 'Unnamed Album';
        const albumArtist = album.artist.length ? album.artist : 'Unknown Artist';

        // Ensure that the .ZIP file and internal folder have legal names
        const cleanDirectoryName = `${albumName} - ${albumArtist}`
            .replace(/[<>:"/\\|?*]/g, '')  // Remove unsafe directory chars
            .replace(/[\u2018\u2019]/g, "'")  // Replacec smart single quotes with regular
            .replace(/[\u201C\u201D]/g, '"')  // Replace smart double quotes with regular
            .replace(/[\u2013\u2014]/g, '-')  // Replace em/en dashes with hyphen
            .replace(/[\u2026]/g, '...')  // Replace ellipsis with three periods
            .replace(/[^\x20-\x7F]/g, '')  // Remove all extra non-ASCII chars
            .trim();  // Remove any leading/trailing white space

        await new Promise<void>((resolve, reject) => {
            const output = createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve());
            archive.on('error', (err: Error) => {
                console.error('Archive ERROR', err);
                reject(err)
            });

            archive.pipe(output);

            archive.directory(tempDir, cleanDirectoryName);

            archive.finalize();
        });

        // Clear temporary directory as it is no longer needed after zipping
        await rm(tempDir, { recursive: true, force: true });

        // Update status to reflect completed Album download
        downloads.set(downloadID, {
            downloadCount: downloadCount,
            total: album.tracklist.length,
            status: 'Downloaded!',
            done: true,
            zipPath: zipPath,
            filename: cleanDirectoryName + '.zip'
        });
    } catch (error) {
        // Update status to show error on download fail
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

// Initial download request. Starts the Album download process
export const POST: RequestHandler = async ({ request }) => {
    try {
        const { album, audioQuality } = await request.json() as { album: Album, audioQuality: number };

        const downloadID = randomUUID();

        downloadAlbum(downloadID, album, audioQuality);
        return json({ downloadID, message: 'Download started.' })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error.';
        return json({ error: message }, { status: 500 });
    }
}

// Continuously polled during download
export const GET: RequestHandler = async ({ url }) => {
    const downloadID: string = url.searchParams.get('id') || '';
    const isStatusCheck: boolean = url.searchParams.get('isStatusCheck') === 'true';  // If not a status check, it is a download request

    if (!downloadID) return json({ error: 'Download ID missing.' }, { status: 400 });

    const download = downloads.get(downloadID);
    if (!download) return json({ error: "Download not found." }, { status: 404 });

    // If the poll is a simple status check, return the download's current progress
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

    // If download is complete and the poll requests the file, provide it
    if (!isStatusCheck && download.done && download.zipPath) {
        try {
            const zipBuffer = await readFile(download.zipPath);

            // Clean up temp ZIP file after reading it
            await unlink(download.zipPath);
            downloads.delete(downloadID);

            // Reutnr the file data
            return new Response(zipBuffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${download.filename}"`,
                    'Content-Length': String(zipBuffer.length)
                }
            })
        } catch (err) {
            console.error(`Failed to download file. ERROR: ${err}`);
            return json({ error: `Failed to download file. ERROR: ${err}` }, { status: 500 });
        }
    }

    return json({ error: 'Invalid action.' }, { status: 400 });
}
