import { json, type RequestHandler } from "@sveltejs/kit";
import * as yt from 'youtube-search-without-api-key';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const query = url.searchParams.get('q');

        if (!query) {
            return json({ error: 'Query parameter missing' }, { status: 400 });
        }

        const videos = await yt.search(query);

        return json({ success: true, video: videos[0] });
    } catch (error) {
        console.log("ERROR in video query:", error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message }, { status: 500 });
    }
}