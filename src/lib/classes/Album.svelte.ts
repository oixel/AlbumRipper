import type { Track } from "./Track.svelte";

export class Album {
    name: string = $state('');
    artist: string = $state('');
    coverURL: string = $state('');
    coverBuffer: Uint8Array | undefined;
    tracklist: Array<Track> = $state([]);

    constructor(name: string = '', artist: string = '', coverURL: string = '') {
        this.name = name;
        this.artist = artist;
        this.coverURL = coverURL;
    }

    // Takes in a track and filters it out of the tracklist
    removeTrack(targetTrack: Track) {
        this.tracklist = this.tracklist.filter((track) => track != targetTrack);
    }

    // Convert image URL into image data buffer and store it
    async storeCoverData() {
        try {
            const response = await fetch(`/api/convert-image?coverURL=${encodeURIComponent(this.coverURL)}`);

            if (!response.ok) {
                console.error("Failed to convert cover URL into image data.");
                return;
            }

            // 
            const imageBuffer = await response.arrayBuffer();
            this.coverBuffer = new Uint8Array(imageBuffer);
        } catch (error) {
            console.error("ERROR fetching cover data:", error);
        }
    }
}