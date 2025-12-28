import youtubedl from 'youtube-dl-exec';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
    const videoUrl = url.searchParams.get('url') as string;

    try {
        const info = await youtubedl(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            callHome: false,
            noCheckCertificates: true
        });

        return json({
            track: info.track || info.title,
            artist: info.artist || info.uploader || info.channel,
            album: info.album || "",
            trackNumber: info.track_number,
            duration: info.duration
        });
    } catch (error) {
        console.error('Failed to get metadata:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message }, { status: 500 });
    }
}