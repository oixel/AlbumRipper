import NodeID3 from 'node-id3';
import { Jimp } from "jimp";
import type { Track } from '$lib/classes/Track.svelte';
import type { Album } from '$lib/classes/Album.svelte';

// Attempt to get cover art's image data from provided URL
export async function fetchCoverImage(url: string): Promise<Buffer | null> {
    try {
        // Get image at cover's URL and resize it into smaller scale and compress to take up minimal storage
        const image = await Jimp.read(url);
        image.resize({ w: 500, h: 500 });
        return await image.getBuffer("image/jpeg", { quality: 80 });;
    } catch (error) {
        console.error('Failed to fetch cover image with ERROR:', error);
        return null;
    }
}

// Takes Track and Album objects and writes the metadata into the file at the given path
export async function writeTrackMetadata(filePath: string, track: Track, album: Album, cover: Buffer | null) {
    // Convert metadata to NodeID3's tags
    const tags: Record<string, unknown> = {}

    // Only apply track attributes that have been given
    if (track.name) tags.title = track.name;
    if (album.name) tags.album = album.name;
    if (album.artist) tags.performerInfo = album.artist;
    if (track.artists.length) tags.artist = track.artists.join('; ');
    if (album.year) tags.year = album.year;
    if (track.number) tags.trackNumber = track.number.toString();
    if (track.duration) tags.length = track.duration.toString();

    // Only apply cover image data to tags if image buffer was properly fetched
    if (cover) {
        tags.image = {
            mime: 'image/jpeg',
            type: {
                id: 3,
                name: 'front cover'
            },
            description: `Album Cover`,
            imageBuffer: cover
        };
    }

    // Write to the MP3 data buffer
    const success = await NodeID3.write(tags, filePath);
    if (!success) console.error("Failed to write metadata to track:", track.name);
}