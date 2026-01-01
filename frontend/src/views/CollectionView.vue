<template>
  <div class="container">
    <div class="collection-header">
      <h2>{{ t("collection.title") }}</h2>
      <button class="btn btn-primary" @click="openAddModal">+ {{ t("collection.addItem") }}</button>
    </div>

    <div class="filters-row">
      <TypeFilterButtons
        :types="mediaTypes"
        :selected-filter="selectedTypeFilter"
        :all-types-label="t('collection.allTypes')"
        :all-count="getAllMediaCount()"
        :type-counts="getTypeCounts()"
        @filter-change="setTypeFilter"
      />
      <div class="search-filters">
        <SearchBar
          v-model="searchQuery"
          :placeholder="t('collection.searchPlaceholder')"
          @search="handleSearch"
          @clear="clearSearch"
        />
        <select v-model="selectedStatusFilter" @change="handleStatusChange" class="status-filter">
          <option value="all">{{ t("collection.allStatuses") }}</option>
          <option value="available">{{ t("status.available") }}</option>
          <option value="borrowed">{{ t("status.borrowed") }}</option>
          <option value="lost">{{ t("status.lost") }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" style="text-align: center; padding: 2rem">
      {{ t("app.loading") }}
    </div>

    <EmptyState
      v-else-if="mediaItems.length === 0"
      :title="getEmptyStateTitle()"
      :message="getEmptyStateMessage()"
    />

    <div v-else class="grid">
      <MediaCard
        v-for="item in mediaItems"
        :key="item.id"
        :item="item"
        :item-fields="getItemTypeFields(item.type_id)"
        @click="openDetailModal"
      />
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="pagination">
      <button
        class="btn btn-secondary"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        ← {{ t("collection.previous") }}
      </button>
      <div class="page-info">
        {{ t("collection.pageInfo", { current: currentPage, total: totalPages }) }}
      </div>
      <button
        class="btn btn-secondary"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        {{ t("collection.next") }} →
      </button>
    </div>

    <MediaDetailModal
      :show="showDetailModal"
      :item="detailItem"
      :item-fields="detailItem ? getItemTypeFields(detailItem.type_id) : []"
      @close="closeDetailModal"
      @edit="openEditFromDetail"
    />

    <MediaItemModal
      :show="showModal"
      :form-data="formData"
      :media-types="mediaTypes"
      :type-configs="typeConfigs"
      :is-editing="!!editingItem"
      :has-changes="formHasChanges"
      @close="closeModal"
      @save="saveItem"
      @delete="deleteItem"
      @field-image-upload="handleFieldImageUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter, type LocationQuery } from "vue-router";
import { api, configApi, uploadApi, type MediaTypeConfig } from "../services/api";
import type { MediaItem, MediaItemWithType, MediaType } from "../types/media";
import SearchBar from "../components/collection/SearchBar.vue";
import TypeFilterButtons from "../components/collection/TypeFilterButtons.vue";
import MediaCard from "../components/collection/MediaCard.vue";
import MediaDetailModal from "../components/collection/MediaDetailModal.vue";
import MediaItemModal from "../components/collection/MediaItemModal.vue";
import EmptyState from "../components/common/EmptyState.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

function getTypeFilterFromUrl(): number | "all" {
  const medium = route.query.medium as string | undefined;
  if (!medium || medium === "all") return "all";
  const parsed = parseInt(medium);
  return isNaN(parsed) ? "all" : parsed;
}

function getStatusFilterFromUrl(): "all" | "available" | "borrowed" | "lost" {
  const status = route.query.status as string | undefined;
  if (status === "available" || status === "borrowed" || status === "lost") {
    return status;
  }
  return "all";
}

function getPageFromUrl(): number {
  const page = route.query.page as string | undefined;
  if (!page) return 1;
  const parsed = parseInt(page);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

function getSearchFromUrl(): string {
  return (route.query.search as string) || "";
}

const mediaItems = ref<MediaItemWithType[]>([]);
const allMediaItems = ref<MediaItemWithType[]>([]);
const allItemsForCounts = ref<MediaItemWithType[]>([]);
const mediaTypes = ref<MediaType[]>([]);
const typeConfigs = ref<MediaTypeConfig[]>([]);
const loading = ref(true);
const countsLoaded = ref(false);
const showModal = ref(false);
const showDetailModal = ref(false);
const detailItem = ref<MediaItemWithType | null>(null);
const editingItem = ref<MediaItemWithType | null>(null);
const formHasChanges = ref(false);
const initialFormData = ref<string>("");
const searchQuery = ref(getSearchFromUrl());
const isSearching = ref(false);
const selectedTypeFilter = ref<number | "all">(getTypeFilterFromUrl());
const selectedStatusFilter = ref<"all" | "available" | "borrowed" | "lost">(
  getStatusFilterFromUrl()
);

const currentPage = ref(getPageFromUrl());
const itemsPerPage = 24;
const totalPages = ref(1);

let isUpdatingUrl = false;

function updateUrlParams() {
  isUpdatingUrl = true;
  const query: Record<string, string> = {};

  if (selectedTypeFilter.value !== "all") {
    query.medium = String(selectedTypeFilter.value);
  }
  if (selectedStatusFilter.value !== "all") {
    query.status = selectedStatusFilter.value;
  }
  if (currentPage.value > 1) {
    query.page = String(currentPage.value);
  }
  if (searchQuery.value.trim()) {
    query.search = searchQuery.value.trim();
  }

  router.replace({ query });

  setTimeout(() => {
    isUpdatingUrl = false;
  }, 0);
}

const formData = ref<
  Partial<MediaItem> & { attributes?: Record<string, string | number | boolean> }
>({
  type_id: undefined,
  title: "",
  status: "available",
  borrowed_by: "",
  borrowed_date: "",
  notes: "",
  attributes: {},
});

let lastTypeId: number | undefined = undefined;

watch(
  formData,
  () => {
    if (showModal.value) {
      const currentFormData = JSON.stringify(formData.value);
      formHasChanges.value = currentFormData !== initialFormData.value;
    }
  },
  { deep: true }
);

watch(
  () => formData.value.type_id,
  async (newTypeId: number | undefined) => {
    if (newTypeId !== lastTypeId && newTypeId !== undefined && newTypeId !== null) {
      const previousTypeId = lastTypeId;
      lastTypeId = newTypeId;

      setTimeout(async () => {
        try {
          const configs = await configApi.getTypeConfigs();
          typeConfigs.value = configs;
        } catch (error) {
          console.warn("Failed to reload type configs:", error);
        }

        if (!formData.value.attributes) {
          formData.value.attributes = {};
        }

        if (previousTypeId !== undefined) {
          const config = typeConfigs.value.find((t: MediaTypeConfig) => t.id === newTypeId);
          if (config) {
            const newTypeFields = config.fields.map(
              (f: MediaTypeConfig["fields"][0]) => f.field_key
            );
            const attributesToKeep: Record<string, string | number | boolean> = {};
            for (const key of newTypeFields) {
              if (formData.value.attributes![key] !== undefined) {
                attributesToKeep[key] = formData.value.attributes![key];
              }
            }
            formData.value.attributes = attributesToKeep;
          }
        }
      }, 100);
    }
  },
  { flush: "post" }
);

watch(
  () => formData.value.status,
  (newStatus: "available" | "borrowed" | "lost" | undefined) => {
    if (newStatus === "borrowed" && !formData.value.borrowed_date) {
      formData.value.borrowed_date = getCurrentDate();
    }
  }
);

watch(
  () => route.query,
  async (newQuery: LocationQuery, oldQuery: LocationQuery | undefined) => {
    if (oldQuery === undefined) return;

    if (isUpdatingUrl) return;

    const newQueryStr = JSON.stringify(newQuery);
    const oldQueryStr = JSON.stringify(oldQuery);
    if (newQueryStr === oldQueryStr) return;

    const newTypeFilter = getTypeFilterFromUrl();
    const newStatusFilter = getStatusFilterFromUrl();
    const newPage = getPageFromUrl();
    const newSearch = getSearchFromUrl();

    selectedTypeFilter.value = newTypeFilter;
    selectedStatusFilter.value = newStatusFilter;
    currentPage.value = newPage;
    searchQuery.value = newSearch;

    if (newSearch.trim() || newStatusFilter !== "all") {
      await handleSearch(false);
    } else {
      await loadData(true);
    }
  },
  { deep: true }
);

onMounted(async () => {
  if (searchQuery.value.trim() || selectedStatusFilter.value !== "all") {
    await handleSearch(false);
  } else {
    await loadData(true);
  }
  document.addEventListener("keydown", handleEscapeKey);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleEscapeKey);
});

async function loadData(preservePage: boolean = false) {
  try {
    loading.value = true;
    const typeParam = selectedTypeFilter.value === "all" ? undefined : selectedTypeFilter.value;
    const statusParam =
      selectedStatusFilter.value === "all" ? undefined : selectedStatusFilter.value;

    const promises: Promise<unknown>[] = [
      api.getMediaItems(typeParam, statusParam),
      api.getMediaTypes(),
    ];

    if (!countsLoaded.value) {
      promises.push(api.getMediaItems());
    }

    const results = await Promise.all(promises);
    const items = results[0] as MediaItemWithType[];
    const types = results[1] as MediaType[];

    allMediaItems.value = items;
    mediaTypes.value = types;

    if (!countsLoaded.value && results[2]) {
      allItemsForCounts.value = results[2] as MediaItemWithType[];
      countsLoaded.value = true;
    }

    try {
      const configs = await configApi.getTypeConfigs();
      typeConfigs.value = configs;
    } catch (configError) {
      console.warn("Failed to load type configs:", configError);
      typeConfigs.value = [];
    }

    if (!preservePage) {
      currentPage.value = 1;
    }

    const maxPage = Math.ceil(allMediaItems.value.length / itemsPerPage);
    if (currentPage.value > maxPage) {
      currentPage.value = Math.max(1, maxPage);
    }
    updatePagination();
  } catch (error) {
    console.error("Failed to load data:", error);
    alert(t("errors.loadFailed"));
  } finally {
    loading.value = false;
  }
}

function updatePagination() {
  totalPages.value = Math.ceil(allMediaItems.value.length / itemsPerPage);
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  mediaItems.value = allMediaItems.value.slice(start, end);
}

function goToPage(page: number, scrollToTop: boolean = true) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  updatePagination();
  updateUrlParams();
  if (scrollToTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

async function handleSearch(resetPage: boolean = true) {
  try {
    isSearching.value = true;
    loading.value = true;
    const typeParam = selectedTypeFilter.value === "all" ? undefined : selectedTypeFilter.value;
    const statusParam =
      selectedStatusFilter.value === "all" ? undefined : selectedStatusFilter.value;

    const query = searchQuery.value.trim() || "";

    const [results, configs] = await Promise.all([
      api.searchMediaItems(query, typeParam, statusParam),
      typeConfigs.value.length === 0
        ? configApi.getTypeConfigs()
        : Promise.resolve(typeConfigs.value),
    ]);

    allMediaItems.value = results;
    if (configs !== typeConfigs.value) {
      typeConfigs.value = configs;
    }

    if (mediaTypes.value.length === 0) {
      mediaTypes.value = await api.getMediaTypes();
    }

    if (resetPage) {
      currentPage.value = 1;
    }
    updatePagination();
    updateUrlParams();
  } catch (error) {
    console.error("Failed to search:", error);
    alert(t("errors.searchFailed"));
  } finally {
    loading.value = false;
    isSearching.value = false;
  }
}

function handleStatusChange() {
  currentPage.value = 1;
  updateUrlParams();
  handleSearch();
}

async function setTypeFilter(typeId: number | "all") {
  selectedTypeFilter.value = typeId;
  currentPage.value = 1;
  updateUrlParams();

  if (
    (searchQuery.value && searchQuery.value.trim().length > 0) ||
    selectedStatusFilter.value !== "all"
  ) {
    await handleSearch();
  } else {
    await loadData();
  }
}

async function clearSearch() {
  searchQuery.value = "";
  currentPage.value = 1;
  updateUrlParams();

  if (selectedStatusFilter.value !== "all") {
    await handleSearch();
  } else {
    await loadData();
  }
}

function getTypeName(typeId: number | "all"): string {
  if (typeId === "all") return "All";
  const type = mediaTypes.value.find((t: MediaType) => t.id === typeId);
  return type?.name || "";
}

function getAllMediaCount(): number | null {
  if (!countsLoaded.value) return null;
  return allItemsForCounts.value.length;
}

function getTypeCounts(): Record<number, number> {
  const counts: Record<number, number> = {};
  if (!countsLoaded.value) return counts;

  mediaTypes.value.forEach((type: MediaType) => {
    counts[type.id] = allItemsForCounts.value.filter(
      (item: MediaItemWithType) => item.type_id === type.id
    ).length;
  });

  return counts;
}

function getEmptyStateTitle(): string {
  if (searchQuery.value) return t("collection.noResults");
  if (selectedTypeFilter.value !== "all") {
    return t("collection.noTypeItemsYet", { type: getTypeName(selectedTypeFilter.value) });
  }
  return t("collection.noItemsYet");
}

function getEmptyStateMessage(): string {
  if (searchQuery.value) return t("collection.tryDifferentSearch");
  return t("collection.startAddingFirstItem");
}

function openDetailModal(item: MediaItemWithType) {
  detailItem.value = item;
  showDetailModal.value = true;
}

function closeDetailModal() {
  showDetailModal.value = false;
  detailItem.value = null;
}

function openEditFromDetail(item: MediaItemWithType) {
  closeDetailModal();
  openEditModal(item);
}

function openAddModal() {
  editingItem.value = null;
  lastTypeId = undefined;
  formData.value = {
    type_id: undefined,
    title: "",
    status: "available",
    borrowed_by: "",
    borrowed_date: "",
    attributes: {},
  };
  initialFormData.value = JSON.stringify(formData.value);
  formHasChanges.value = false;
  showModal.value = true;
}

function openEditModal(item: MediaItemWithType) {
  editingItem.value = item;

  formData.value = {
    type_id: item.type_id,
    title: item.title,
    status: item.status,
    borrowed_by: item.borrowed_by || "",
    borrowed_date: item.borrowed_date || "",
    attributes: {},
  };

  const config = typeConfigs.value.find((t: MediaTypeConfig) => t.id === item.type_id);
  if (config) {
    const STANDARD_FIELDS = ["notes", "cover_image"];
    for (const field of config.fields) {
      let value;

      if (STANDARD_FIELDS.includes(field.field_key)) {
        value = item[field.field_key] as string | number | boolean | undefined;
      } else {
        value = item.attributes?.[field.field_key];
      }

      if (field.field_type === "boolean" && typeof value === "string") {
        value = value === "true";
      }

      if (STANDARD_FIELDS.includes(field.field_key)) {
        (formData.value as MediaItem)[field.field_key] = value;
      } else {
        if (!formData.value.attributes) {
          formData.value.attributes = {};
        }
        if (value !== undefined) {
          formData.value.attributes[field.field_key] = value;
        }
      }
    }
  }

  initialFormData.value = JSON.stringify(formData.value);
  formHasChanges.value = false;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  formHasChanges.value = false;
  initialFormData.value = "";
  editingItem.value = null;
}

async function saveItem(
  formData: Partial<MediaItem> & { attributes?: Record<string, string | number | boolean> }
) {
  try {
    const config = typeConfigs.value.find((t: MediaTypeConfig) => t.id === formData.type_id);
    if (!config) return;

    for (const field of config.fields) {
      const STANDARD_FIELDS = ["notes", "cover_image"];
      const value = STANDARD_FIELDS.includes(field.field_key)
        ? (formData as MediaItem)[field.field_key]
        : formData.attributes?.[field.field_key];

      if (field.field_type === "keyvalue") {
        let pairs: Array<{ key: string | null; value: string | null }> = [];
        if (value && typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              pairs = parsed;
            }
          } catch {
            pairs = [];
          }
        }

        const validPairs = pairs.filter(
          (pair) =>
            (pair.key !== null && pair.key !== undefined && String(pair.key).trim() !== "") ||
            (pair.value !== null && pair.value !== undefined && String(pair.value).trim() !== "")
        );

        if (field.required && validPairs.length === 0) {
          alert(t("keyvalue.requiresAtLeastOne", { field: field.field_label }));
          return;
        }
      } else if (field.required) {
        if (value === null || value === undefined || value === "" || value === 0) {
          alert(`${field.field_label} ${t("common.required").toLowerCase()}`);
          return;
        }
      }
    }

    const itemData: MediaItem = {
      type_id: formData.type_id,
      title: formData.title,
      status: formData.status,
      borrowed_by: formData.borrowed_by,
      borrowed_date: formData.borrowed_date,
    } as MediaItem;

    const processedAttributes: Record<string, string> = {};
    const imagesToUpload: Array<{ key: string; value: string; isStandard: boolean }> = [];

    const STANDARD_FIELDS = ["notes", "cover_image"];

    for (const field of config.fields) {
      const value = STANDARD_FIELDS.includes(field.field_key)
        ? (formData as MediaItem)[field.field_key]
        : formData.attributes?.[field.field_key];

      if (value === null || value === undefined || value === "") {
        continue;
      }

      if (field.field_type === "keyvalue") {
        let pairs: Array<{ key: string | null; value: string | null }> = [];
        if (value && typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              pairs = parsed;
            }
          } catch {
            pairs = [];
          }
        }

        const processedPairs = pairs
          .filter((pair) => {
            const key = pair.key !== null && pair.key !== undefined ? String(pair.key).trim() : "";
            const value =
              pair.value !== null && pair.value !== undefined ? String(pair.value).trim() : "";
            return key !== "" || value !== "";
          })
          .map((pair) => {
            const key = pair.key !== null && pair.key !== undefined ? String(pair.key).trim() : "";
            const value =
              pair.value !== null && pair.value !== undefined ? String(pair.value).trim() : "";
            return {
              key: key !== "" ? key : null,
              value: value !== "" ? value : null,
            };
          });

        if (processedPairs.length > 0) {
          if (STANDARD_FIELDS.includes(field.field_key)) {
            itemData[field.field_key] = JSON.stringify(processedPairs);
          } else {
            processedAttributes[field.field_key] = JSON.stringify(processedPairs);
          }
        }
      } else if (field.field_type === "image") {
        if (typeof value === "string" && value.startsWith("data:image")) {
          imagesToUpload.push({
            key: field.field_key,
            value,
            isStandard: STANDARD_FIELDS.includes(field.field_key),
          });
          continue;
        } else if (typeof value === "string") {
          if (STANDARD_FIELDS.includes(field.field_key)) {
            itemData[field.field_key] = value;
          } else {
            processedAttributes[field.field_key] = value;
          }
        }
      } else if (field.field_type === "boolean") {
        const boolValue = typeof value === "boolean" ? value : value === "true";
        if (STANDARD_FIELDS.includes(field.field_key)) {
          itemData[field.field_key] = boolValue;
        } else {
          processedAttributes[field.field_key] = boolValue ? "true" : "false";
        }
      } else {
        if (STANDARD_FIELDS.includes(field.field_key)) {
          itemData[field.field_key] = value;
        } else {
          processedAttributes[field.field_key] = String(value);
        }
      }
    }

    if (Object.keys(processedAttributes).length > 0) {
      itemData.attributes = processedAttributes;
    }

    let savedItem;
    if (editingItem.value) {
      savedItem = await api.updateMediaItem(editingItem.value.id!, itemData);
    } else {
      savedItem = await api.createMediaItem(itemData);
    }

    const uploadErrors: string[] = [];
    for (const { key, value, isStandard } of imagesToUpload) {
      try {
        const file = dataURLtoFile(value, `${key}.jpg`);

        if (isStandard && key === "cover_image") {
          await uploadApi.uploadCoverImage(savedItem.id!, file);
        } else {
          await uploadApi.uploadAttributeImage(savedItem.id!, key, file);
        }
      } catch (uploadError) {
        const error = uploadError as Error;
        console.error(`Failed to upload image for ${key}:`, error);
        uploadErrors.push(`${key}: ${error.message || "Upload failed"}`);
      }
    }

    const scrollY = window.scrollY;

    if (searchQuery.value.trim() || selectedStatusFilter.value !== "all") {
      await handleSearch(false);
    } else {
      await loadData(true);
    }
    await refreshCounts();
    closeModal();

    window.scrollTo({ top: scrollY, behavior: "instant" });

    if (uploadErrors.length > 0) {
      alert(`${t("errors.partialUploadFailed")}\n${uploadErrors.join("\n")}`);
    }
  } catch (error) {
    console.error("Failed to save item:", error);
    alert(t("errors.saveFailed"));
  }
}

function dataURLtoFile(dataurl: string, filename: string): File {
  try {
    const arr = dataurl.split(",");
    if (arr.length < 2) {
      throw new Error("Invalid data URL format");
    }

    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch?.[1] || "image/jpeg";

    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    const ext = mime.split("/")[1] || "jpg";
    const finalFilename = filename.endsWith(`.${ext}`)
      ? filename
      : `${filename.replace(/\.[^.]+$/, "")}.${ext}`;

    return new File([u8arr], finalFilename, { type: mime });
  } catch (error) {
    console.error("Error converting data URL to file:", error);
    throw new Error("Failed to convert image data");
  }
}

async function deleteItem() {
  if (!editingItem.value) return;

  if (!confirm(t("collection.confirmDelete"))) {
    return;
  }

  try {
    const scrollY = window.scrollY;
    await api.deleteMediaItem(editingItem.value.id!);

    if (searchQuery.value.trim() || selectedStatusFilter.value !== "all") {
      await handleSearch(false);
    } else {
      await loadData(true);
    }
    await refreshCounts();
    closeModal();

    window.scrollTo({ top: scrollY, behavior: "instant" });
  } catch (error) {
    console.error("Failed to delete item:", error);
    alert(t("errors.deleteFailed"));
  }
}

async function refreshCounts() {
  try {
    allItemsForCounts.value = await api.getMediaItems();
  } catch (error) {
    console.warn("Failed to refresh counts:", error);
  }
}

function getItemTypeFields(typeId: number) {
  const config = typeConfigs.value.find((t: MediaTypeConfig) => t.id === typeId);
  return (
    config?.fields.sort(
      (a: MediaTypeConfig["fields"][0], b: MediaTypeConfig["fields"][0]) =>
        a.display_order - b.display_order
    ) || []
  );
}

function getCurrentDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function handleFieldImageUpload(event: Event, fieldKey: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!validImageTypes.includes(file.type)) {
    alert(t("errors.invalidImageType"));
    input.value = "";
    return;
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    alert(t("errors.imageTooLarge"));
    input.value = "";
    return;
  }

  try {
    const STANDARD_FIELDS = ["notes", "cover_image"];
    const setFieldValue = (key: string, value: string) => {
      if (STANDARD_FIELDS.includes(key)) {
        (formData.value as Record<string, string>)[key] = value;
      } else {
        if (!formData.value.attributes) {
          formData.value.attributes = {};
        }
        formData.value.attributes[key] = value;
      }
    };

    if (editingItem.value?.id) {
      if (fieldKey === "cover_image") {
        const result = await uploadApi.uploadCoverImage(editingItem.value.id, file);
        setFieldValue(fieldKey, result.url);
      } else {
        const result = await uploadApi.uploadAttributeImage(editingItem.value.id, fieldKey, file);
        setFieldValue(fieldKey, result.url);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFieldValue(fieldKey, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  } catch (error) {
    console.error("Failed to upload image:", error);
    alert(t("errors.uploadFailed"));
  }
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (showModal.value) {
      closeModal();
    } else if (showDetailModal.value) {
      closeDetailModal();
    }
  }
}
</script>

<style scoped>
.collection-header {
  margin-bottom: var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  border-bottom: 2px solid var(--color-border-light);
}

.search-filters {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-shrink: 0;
}

.status-filter {
  padding: 0.75rem var(--spacing-md);
  padding-right: 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
  min-width: 140px;
  flex-shrink: 0;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-md) center;
}

.status-filter:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.status-filter:hover {
  border-color: var(--color-primary);
}

.status-filter option {
  background: var(--color-surface);
  color: var(--color-text);
}

/* Dark mode dropdown arrow */
.dark-mode .status-filter {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
}

.collection-header h2 {
  margin: 0;
  flex: 0 0 auto;
  color: var(--color-text);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

@media (max-width: 768px) {
  .collection-header {
    gap: 0.75rem;
  }

  .collection-header h2 {
    flex: 1 1 100%;
  }

  .collection-header .btn-primary {
    width: 100%;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }

  .search-filters {
    flex: 1 1 100%;
    width: 100%;
  }

  .status-filter {
    min-width: 120px;
    flex: 1 1 auto;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .filters-row {
    flex-wrap: wrap;
  }

  .search-filters {
    flex: 1 1 320px;
    min-width: 320px;
  }

  .status-filter {
    min-width: 120px;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-xl);
  padding: var(--spacing-lg) 0;
}

.page-info {
  font-size: 0.9rem;
  color: var(--color-text-subtle);
  min-width: 120px;
  text-align: center;
}

.pagination .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
