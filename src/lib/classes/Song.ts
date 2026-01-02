export class Song {
    name: string = '';
    artist: string = '';
    trackNumber: number = 0;
    duration: number = 0;

    constructor(name: string, trackNumber: number, duration: number) {
        this.name = name;
        this.artist = '';

        this.trackNumber = trackNumber;
        this.duration = duration;
    }
}