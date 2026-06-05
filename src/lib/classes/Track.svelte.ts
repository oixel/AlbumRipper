export class Track {
    name: string = $state('');
    id: string = $state('');  // MusicBrainz's special track id used as a constant key in AlbumView loop
    artists: Array<string> = $state([]);
    disc: number = $state(1);
    number: number = $state(0);
    duration: number = 0;
    videoURL: string = $state('');

    constructor(id: string, disc: number, number: number, name: string, artists: Array<string>, duration: number) {
        this.id = id;
        this.disc = disc;
        this.number = number;
        this.name = name;
        this.artists = artists
        this.duration = duration;
    }
}