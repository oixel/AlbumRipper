<script lang="ts">
	let { name, trackNumber, duration } = $props();
</script>

<div class="ml-4 flex gap-2">
	<p><b>Track #{trackNumber}</b> - {name}</p>
</div>
