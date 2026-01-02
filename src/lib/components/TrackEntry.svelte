<script lang="ts">
	let { name, trackNumber, videoURL } = $props();
</script>

<div class="ml-4 flex gap-2">
	<p><b>Track #{trackNumber}</b> - {name}</p>
	<a href={videoURL} aria-label={`YouTube Video URL for track named ${name}`}>[ Video ]</a>
</div>
