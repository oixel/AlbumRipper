import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }: { url: URL }) => {
    const coverURL: string = url.searchParams.get('coverURL') || "";

    if (!coverURL) return json({ error: 'Cover URL missing.' }, { status: 400 });

    try {
        const response = await fetch(coverURL);

        if (!response.ok) return json({ error: 'Failed to fetch image.' }, { status: 500 });

        const imageBuffer = await response.arrayBuffer();

        return new Response(imageBuffer, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg'
            }
        });
    } catch (error) {
        console.error('ERROR fetching cover:', error);
        return json({ error: 'Failed to download cover image.' }, { status: 500 });
    }
};