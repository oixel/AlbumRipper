import type { Song } from "./Song";

export class Album {
    name: string = '';
    tracklist: Array<Song> = [];
    coverURL: string = '';

    constructor(name: string, coverURL: string) {
        this.name = name;
        this.coverURL = coverURL;
    }
}