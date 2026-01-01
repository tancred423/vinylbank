<template>
  <div class="search-wrapper">
    <input
      class="search-input"
      type="text"
      :value="modelValue"
      @input="handleInput"
      :placeholder="placeholder"
    />
    <button v-if="modelValue" @click="handleClear" class="btn btn-danger clear-search-btn">
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from "vue";

defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "search"): void;
  (e: "clear"): void;
}>();

const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const debounceDelayMs = 300;

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit("update:modelValue", value);
  
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
  
  debounceTimer.value = setTimeout(() => {
    emit("search");
  }, debounceDelayMs);
}

function handleClear() {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
    debounceTimer.value = null;
  }
  emit("update:modelValue", "");
  emit("clear");
}

onBeforeUnmount(() => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
});
</script>

<style scoped>
.search-wrapper {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}

.search-input {
  flex: 1;
  padding: 0.75rem var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--color-surface);
  color: var(--color-text);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
  min-width: 0;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.search-input::placeholder {
  color: var(--color-text-subtle);
}

.clear-search-btn {
  flex-shrink: 0;
  padding: 0.75rem var(--spacing-md);
}

@media (max-width: 768px) {
  .search-wrapper {
    flex: 1 1 60%;
    max-width: none;
    margin-left: 0;
  }
}
</style>
