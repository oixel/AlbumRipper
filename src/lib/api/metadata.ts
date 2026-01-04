import NodeID3 from 'node-id3';
import { Jimp } from "jimp";
import type { Track } from '$lib/classes/Track.svelte';
import type { Album } from '$lib/classes/Album.svelte';

// export async function getMetadata(url: string) {
//     try {
//         const info = await youtubedl(url, {
//             dumpSingleJson: true,
//             noWarnings: true,
//             callHome: false,
//             noCheckCertificates: true
//         });

//         return {
//             track: info.track || info.title,
//             artist: info.artist || info.uploader || info.channel,
//             album: info.album || "",
//             trackNumber: info.track_number,
//             duration: info.duration,
//             cover: info.thumbnail
//         };
//     } catch (error) {
//         console.error(`Failed to get metadata:`, error);
//         return null;
//     }
// }

// export async function writeMetadata(metadata: any, filePath: string) {
//     if (!metadata) return;

//     // Get image data buffer from the cover's URL
//     console.log(metadata.cover);
//     const response = await fetch(metadata.cover);
//     const imageBuffer = Buffer.from(await response.arrayBuffer());

//     // Convert metadata to NodeID3's tags
//     const tags = {
//         title: metadata.track,
//         artist: metadata.artist,
//         album: metadata.album,
//         trackNumber: metadata.trackNumber,
//         length: metadata.duration,
//         image: {
//             mime: 'image/jpeg',
//             type: {
//                 id: 0,
//                 name: 'front cover'
//             },
//             description: `Album cover for ${metadata.track}`,
//             imageBuffer: imageBuffer
//         }
//     }

//     // Attempt to write to the MP3 data buffer
//     const success = await NodeID3.write(tags, filePath);
//     if (!success) console.error("Failed to write metadata for URL:", url);
// }

// 
export async function fetchCoverImage(url: string): Promise<Buffer | null> {
    try {
        // Get image at cover's URL and resize it into smaller scale and compress to take up minimal storage
        const image = await Jimp.read(url);
        image.resize({ w: 500, h: 500 });
        return await image.getBuffer("image/jpeg");;
    } catch (error) {
        console.error('Failed to fetch cover image with ERROR:', error);
        return null;
    }
}

// Takes Track and Album objects and writes the metadata into the file at the given path
export async function writeTrackMetadata(filePath: string, track: Track, album: Album, cover: Buffer | null) {
    // Convert metadata to NodeID3's tags
    const tags: Record<string, unknown> = {
        title: track.name,
        artist: track.artists.join(','),
        album: album.name,
        trackNumber: track.number.toString(),
        length: track.duration.toString()
    }

    // Only apply cover image data to tags if image buffer was properly fetched
    if (cover) {
        tags.image = {
            mime: 'image/jpeg',
            type: {
                id: 0,
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