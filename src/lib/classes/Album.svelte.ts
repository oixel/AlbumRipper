import type { Track } from "./Track";

export class Album {
    name: string = $state('');
    coverURL: string = $state('');
    tracklist: Array<Track> = $state([]);

    constructor(name: string = '', coverURL: string = '') {
        this.name = name;
        this.coverURL = coverURL;
    }
}