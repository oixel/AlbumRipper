import type { Song } from "./Song";

export interface Album {
    name: string;
    artist: string;
    trackCount: number;
    tracklist: Array<Song>;
    coverURL: string;
}