export class DownloadProgress {
    downloading = $state(false);
    downloadCount = $state(0);
    total = $state(0);
    currentTrack = $state('');
    status = $state('');
    downloadID = $state('');
}