export class Track {
    name: string = '';
    artist: string = '';
    number: number = 0;
    duration: number = 0;
    videoURL: string = '';

    constructor(name: string, artist: string, number: number, duration: number) {
        this.name = name;
        this.artist = artist;

        this.number = number;
        this.duration = duration;
    }
}