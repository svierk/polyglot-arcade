<script setup lang="ts">
/**
 * The teaser marquee of a game, as the hub lobby shows it on the game's card.
 * The pixel art is imported from the hub itself, so the docs never drift from
 * the app. Same drawing as the hub's TeaserMarqueeComponent: one rectangle per
 * run of equal pixels.
 */
import { computed } from 'vue';
import { teaserMarquee } from '../../../../force-app/main/default/uiBundles/polyglotArcade/src/app/games/marquees';

const props = defineProps<{ game: string }>();

const art = computed(() => teaserMarquee(props.game));
const width = computed(() => art.value?.rows[0]?.length ?? 0);
const height = computed(() => art.value?.rows.length ?? 0);
const runs = computed(() => {
  const result: { x: number; y: number; width: number; color: string }[] = [];
  art.value?.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const char = row[x];
      let end = x + 1;
      while (row[end] === char) end++;
      const color = art.value!.palette[char];
      if (color) result.push({ x, y, width: end - x, color });
      x = end;
    }
  });
  return result;
});
</script>

<template>
  <svg
    v-if="art"
    class="teaser-marquee"
    :viewBox="`0 0 ${width} ${height}`"
    shape-rendering="crispEdges"
    aria-hidden="true"
  >
    <rect :width="width" :height="height" :fill="art.background" />
    <rect v-for="(run, i) in runs" :key="i" :x="run.x" :y="run.y" :width="run.width" height="1" :fill="run.color" />
  </svg>
</template>

<style scoped>
.teaser-marquee {
  display: block;
  width: 100%;
  max-width: 480px;
  aspect-ratio: 4 / 1;
  border-radius: 6px;
}
</style>
