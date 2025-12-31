<template>
  <div id="app" :class="themeClass">
    <AppHeader :theme="theme" @theme-change="handleThemeChange" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import AppHeader from "./components/common/AppHeader.vue";

const theme = ref<"auto" | "light" | "dark">("auto");

const themeClass = computed(() => {
  if (theme.value === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-mode" : "light-mode";
  }
  return theme.value === "dark" ? "dark-mode" : "light-mode";
});

function handleThemeChange(newTheme: "auto" | "light" | "dark") {
  theme.value = newTheme;
  localStorage.setItem("vinylbank-theme", newTheme);
}

onMounted(() => {
  const savedTheme = localStorage.getItem("vinylbank-theme") as "auto" | "light" | "dark" | null;
  if (savedTheme) {
    theme.value = savedTheme;
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (theme.value === "auto") {
      document.getElementById("app")?.setAttribute("class", themeClass.value);
    }
  });
});
</script>
