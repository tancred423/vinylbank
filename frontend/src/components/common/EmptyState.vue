<template>
  <div class="empty-state">
    <h3>{{ title }}</h3>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  message?: string;
}>();
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-subtle);
}

.empty-state h3 {
  margin-bottom: var(--spacing-sm);
  color: var(--color-text-muted);
}
</style>
