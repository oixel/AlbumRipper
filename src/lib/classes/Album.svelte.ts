import type { Track } from "./Track.svelte";

export class Album {
    name: string = $state('');
    artist: string = $state('');
    year: string = $state('');
    coverURL: string = $state('');
    discCount: number = $state(1);
    tracklist: Array<Track> = $state([]);

    constructor(name: string = '',
        artist: string = '',
        year: string = '',
        coverURL: string = '',
        discCount: number = 1,
        tracklist: Array<Track> = []
    ) {
        this.name = name;
        this.artist = artist;
        this.year = year;
        this.coverURL = coverURL;
        this.discCount = discCount;
        this.tracklist = tracklist;
    }

    // Takes in a track and filters it out of the tracklist
    removeTrack(targetTrack: Track) {
        this.tracklist = this.tracklist.filter((track) => track != targetTrack);
    }

    // Called on "Disc #" input of edit view. Ensures disc count does not become outdated
    updateDiscCount() {
        this.discCount = Math.max(...this.tracklist.map((track: Track) => track.disc));
        console.log(this.discCount);
    }
}