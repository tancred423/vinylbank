<template>
  <div class="filter-buttons-wrapper">
    <button
      class="link-btn link-btn--bordered"
      :class="{ active: selectedFilter === 'all' }"
      @click="handleFilterChange('all')"
    >
      {{ allTypesLabel }}<span v-if="allCount !== null" class="count"> ({{ allCount }})</span>
    </button>
    <button
      v-for="type in types"
      :key="type.id"
      class="link-btn link-btn--bordered"
      :class="{ active: selectedFilter === type.id }"
      @click="handleFilterChange(type.id)"
    >
      {{ type.name
      }}<span v-if="typeCounts[type.id] !== undefined" class="count">
        ({{ typeCounts[type.id] }})</span
      >
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MediaType } from "../../types/media";

defineProps<{
  types: MediaType[];
  selectedFilter: number | "all";
  allTypesLabel: string;
  allCount: number | null;
  typeCounts: Record<number, number>;
}>();

const emit = defineEmits<{
  (e: "filter-change", typeId: number | "all"): void;
}>();

function handleFilterChange(typeId: number | "all") {
  emit("filter-change", typeId);
}
</script>

<style scoped>
.filter-buttons-wrapper {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
}

.count {
  opacity: 0.7;
  font-weight: normal;
}
</style>
