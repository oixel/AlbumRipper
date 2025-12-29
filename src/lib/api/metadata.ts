import youtubedl from 'youtube-dl-exec';
import NodeID3 from 'node-id3';

export async function getMetadata(url: string) {
    try {
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            callHome: false,
            noCheckCertificates: true
        });

        return {
            track: info.track || info.title,
            artist: info.artist || info.uploader || info.channel,
            album: info.album || "",
            trackNumber: info.track_number,
            duration: info.duration,
            cover: info.thumbnail
        };
    } catch (error) {
        console.error(`Failed to get metadata:`, error);
        return null;
    }
}

export async function writeMetadata(metadata: any, filePath: string) {
    if (!metadata) return;

    // Get image data buffer from the cover's URL
    console.log(metadata.cover);
    const response = await fetch(metadata.cover);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Convert metadata to NodeID3's tags
    const tags = {
        title: metadata.track,
        artist: metadata.artist,
        album: metadata.album,
        trackNumber: metadata.trackNumber,
        length: metadata.duration,
        image: {
            mime: 'image/jpeg',
            type: {
                id: 0,
                name: 'front cover'
            },
            description: `Album cover for ${metadata.track}`,
            imageBuffer: imageBuffer
        }
    }

    // Attempt to write to the MP3 data buffer
    const success = await NodeID3.write(tags, filePath);
    if (!success) console.error("Failed to write metadata for URL:", url);
}