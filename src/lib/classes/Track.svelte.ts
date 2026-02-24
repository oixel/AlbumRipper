export class Track {
    name: string = $state('');
    artists: Array<string> = $state([]);
    number: number = $state(0);
    duration: number = 0;
    videoURL: string = $state('');
    editing: boolean = $state(false);

    constructor(number: number, name: string, artists: Array<string>, duration: number) {
        this.number = number;
        this.name = name;
        this.artists = artists
        this.duration = duration;
    }
}