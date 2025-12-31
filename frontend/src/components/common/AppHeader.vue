<template>
  <header class="top-bar">
    <div class="container top-bar__content">
      <router-link to="/" class="brand">
        <h1>
          <img src="/vinyl-record.png" alt="VinylBank" class="brand-icon" />
          {{ t("app.title") }}
        </h1>
      </router-link>
      <nav class="top-nav" aria-label="Primary navigation">
        <router-link
          to="/collection"
          class="link-btn nav-link"
          :class="{ active: currentRoute === 'collection' }"
        >
          {{ t("nav.collection") }}
        </router-link>
        <router-link
          to="/config"
          class="link-btn nav-link"
          :class="{ active: currentRoute === 'config' }"
        >
          {{ t("nav.config") }}
        </router-link>
        <router-link
          to="/import-export"
          class="link-btn nav-link"
          :class="{ active: currentRoute === 'import-export' }"
        >
          {{ t("nav.importExport") }}
        </router-link>
      </nav>
      <div class="header-actions">
        <button class="settings-btn" @click="cycleTheme" :title="getThemeTitle()">
          {{ getThemeIcon() }}
        </button>
        <div class="language-dropdown" ref="languageDropdown">
          <button class="settings-btn lang-toggle" @click="toggleLanguageDropdown">
            {{ locale.toUpperCase() }}
            <span class="dropdown-arrow">▼</span>
          </button>
          <div v-if="showLanguageDropdown" class="lang-dropdown-menu">
            <button
              class="lang-option"
              :class="{ active: locale === 'en' }"
              @click="setLocale('en')"
            >
              EN - English
            </button>
            <button
              class="lang-option"
              :class="{ active: locale === 'de' }"
              @click="setLocale('de')"
            >
              DE - Deutsch
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const route = useRoute();

const languageDropdown = ref<HTMLElement | null>(null);
const showLanguageDropdown = ref(false);

const props = defineProps<{
  theme: "auto" | "light" | "dark";
}>();

const emit = defineEmits<{
  (e: "theme-change", theme: "auto" | "light" | "dark"): void;
}>();

const currentRoute = computed(() => {
  if (route.path === "/config") return "config";
  if (route.path === "/import-export") return "import-export";
  return "collection";
});

function cycleTheme() {
  const themes: Array<"auto" | "light" | "dark"> = ["auto", "light", "dark"];
  const currentIndex = themes.indexOf(props.theme);
  const nextIndex = (currentIndex + 1) % themes.length;
  emit("theme-change", themes[nextIndex]);
}

function getThemeIcon() {
  switch (props.theme) {
    case "auto":
      return "🌓";
    case "light":
      return "☀️";
    case "dark":
      return "🌙";
    default:
      return "🌓";
  }
}

function getThemeTitle() {
  switch (props.theme) {
    case "auto":
      return t("settings.theme") + ": " + t("settings.auto");
    case "light":
      return t("settings.theme") + ": " + t("settings.lightMode");
    case "dark":
      return t("settings.theme") + ": " + t("settings.darkMode");
    default:
      return t("settings.theme");
  }
}

function setLocale(newLocale: "en" | "de") {
  locale.value = newLocale;
  localStorage.setItem("locale", newLocale);
  showLanguageDropdown.value = false;
}

function toggleLanguageDropdown() {
  showLanguageDropdown.value = !showLanguageDropdown.value;
}

function handleClickOutside(event: MouseEvent) {
  if (languageDropdown.value && !languageDropdown.value.contains(event.target as Node)) {
    showLanguageDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.top-bar {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-md);
}

.top-bar__content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 0 0 auto;
  text-decoration: none;
}

.brand h1 {
  font-size: 1.5rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-text);
}

.brand-icon {
  width: 1.75rem;
  height: 1.75rem;
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;
}

.top-nav {
  display: flex;
  gap: var(--spacing-sm);
  flex: 1 1 auto;
  justify-content: center;
}

.nav-link {
  white-space: nowrap;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-actions .settings-btn {
  font-size: 1.25rem;
  min-width: 2.75rem;
  height: 2.75rem;
}

.lang-toggle {
  font-size: 1rem !important;
  font-weight: 600;
  gap: 0.25rem;
  min-width: auto;
  padding: 0.5rem 0.6rem;
}

.language-dropdown {
  position: relative;
}

.dropdown-arrow {
  font-size: 0.7rem;
  transition: transform var(--transition-fast);
}

.lang-dropdown-menu {
  position: absolute;
  top: calc(100% + var(--spacing-sm));
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
}

.lang-option {
  width: 100%;
  padding: 0.75rem var(--spacing-md);
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
  text-align: left;
  transition: all var(--transition-fast);
  display: block;
}

.lang-option:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.lang-option.active {
  background: rgba(102, 126, 234, 0.15);
  color: var(--color-primary);
  font-weight: 600;
}

.dark-mode .lang-option.active {
  background: rgba(102, 126, 234, 0.25);
  color: #a8b8ff;
}

@media (max-width: 768px) {
  .top-bar {
    margin-bottom: 0;
  }

  .top-bar__content {
    gap: 0.75rem;
  }

  .brand {
    order: 1;
  }

  .brand h1 {
    font-size: 1.25rem;
  }

  .brand-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .top-nav {
    order: 3;
    flex-basis: 100%;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .nav-link {
    flex: 1;
    padding: var(--spacing-sm) 0.75rem;
    font-size: 0.9rem;
  }

  .header-actions {
    order: 2;
    gap: var(--spacing-sm);
  }

  .header-actions .settings-btn {
    height: 2.5rem;
    min-width: 2.5rem;
    padding: 0.4rem 0.6rem;
    font-size: 1.1rem;
  }

  .lang-toggle {
    font-size: 0.7rem;
    padding: 0.4rem 0.5rem;
  }
}
</style>
