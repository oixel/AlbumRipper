import type { Track } from "./Track.svelte";

export class Album {
    name: string = $state('');
    coverURL: string = $state('');
    tracklist: Array<Track> = $state([]);

    constructor(name: string = '', coverURL: string = '') {
        this.name = name;
        this.coverURL = coverURL;
    }

    // Takes in a track and filters it out of the tracklist
    removeTrack(targetTrack: Track) {
        this.tracklist = this.tracklist.filter((track) => track != targetTrack);
    }
}