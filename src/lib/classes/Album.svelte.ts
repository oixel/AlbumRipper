import type { Track } from "./Track.svelte";

export class Album {
    name: string = $state('');
    artist: string = $state('');
    year: string = $state('');
    coverURL: string = $state('');
    tracklist: Array<Track> = $state([]);

    constructor(name: string = '', artist: string = '', year: string = '', coverURL: string = '', tracklist: Array<Track> = []) {
        this.name = name;
        this.artist = artist;
        this.year = year;
        this.coverURL = coverURL;
        this.tracklist = tracklist;
    }

    // Takes in a track and filters it out of the tracklist
    removeTrack(targetTrack: Track) {
        this.tracklist = this.tracklist.filter((track) => track != targetTrack);
    }
}