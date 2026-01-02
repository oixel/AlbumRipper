export class Track {
    name: string = '';
    artist: string = '';
    trackNumber: number = 0;
    duration: number = 0;
    videoURL: string = '';

    constructor(name: string, artist: string, trackNumber: number, duration: number) {
        this.name = name;
        this.artist = artist;

        this.trackNumber = trackNumber;
        this.duration = duration;
    }
}