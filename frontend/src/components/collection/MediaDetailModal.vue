<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal detail-modal">
      <div class="modal-header">
        <div class="header-content">
          <h2>{{ item?.title }}</h2>
          <button
            class="btn btn-primary btn-sm edit-btn"
            @click="handleEdit"
            :title="t('common.edit')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            {{ t("common.edit") }}
          </button>
        </div>
        <button class="close-btn" @click="handleClose">&times;</button>
      </div>

      <div class="detail-content">
        <div class="detail-meta">
          <span class="detail-type">{{ item?.type_name }}</span>
          <span class="badge" :class="`badge-${item?.status}`">
            {{ t(`status.${item?.status}`) }}
          </span>
        </div>

        <div v-if="item?.status === 'borrowed'" class="borrow-info">
          <div>
            <strong>{{ t("item.borrowedBy") }}:</strong> {{ item.borrowed_by }}
          </div>
          <div v-if="item.borrowed_date">
            <strong>{{ t("item.borrowedDate") }}:</strong> {{ formatDate(item.borrowed_date) }}
          </div>
          <div v-if="item.borrowed_date" class="borrow-duration">
            {{ getRelativeBorrowDuration(item.borrowed_date) }}
          </div>
        </div>

        <div class="detail-fields">
          <div
            v-for="field in itemFields"
            :key="field.id"
            class="detail-field"
            v-show="hasFieldValue(field.field_key, field)"
          >
            <div class="field-label">{{ field.field_label }}</div>

            <div v-if="field.field_type === 'image'" class="field-image">
              <img
                :src="getFieldValueAsString(field.field_key)"
                :alt="field.field_label"
                @error="handleImageError"
                @click="openLightbox(getFieldValueAsString(field.field_key) || '')"
                class="clickable-image"
              />
            </div>

            <div
              v-else-if="field.field_type === 'boolean'"
              class="field-value field-value--boolean"
              :class="{
                'field-value--boolean-true': isFieldValueTrue(field.field_key),
                'field-value--boolean-false': !isFieldValueTrue(field.field_key),
              }"
            >
              {{ isFieldValueTrue(field.field_key) ? t("common.yes") : t("common.no") }}
            </div>

            <div
              v-else-if="field.field_type === 'checkbox'"
              class="field-value field-value--checkbox"
            >
              <span
                v-for="item in getCheckedItems(field.field_key, field.options)"
                :key="item"
                class="checkbox-item"
              >
                ✓ {{ item }}
              </span>
            </div>

            <div v-else-if="field.field_type === 'radio'" class="field-value">
              {{ getFieldValue(field.field_key) || "—" }}
            </div>

            <div v-else-if="field.field_type === 'rating'" class="field-value field-value--rating">
              <span class="rating-stars">{{ renderStars(getFieldValue(field.field_key)) }}</span>
              <span class="rating-number">({{ getFieldValue(field.field_key) }}/5)</span>
            </div>

            <div
              v-else-if="field.field_type === 'textarea'"
              class="field-value field-value--multiline"
            >
              {{ getFieldValue(field.field_key) }}
            </div>

            <div
              v-else-if="field.field_type === 'keyvalue'"
              class="field-value field-value--keyvalue"
            >
              <div
                v-for="(pair, index) in getKeyValuePairs(field.field_key)"
                :key="index"
                class="keyvalue-item"
              >
                <span class="keyvalue-key">{{ pair.key }}</span>
                <span class="keyvalue-separator">→</span>
                <span class="keyvalue-value">{{ pair.value }}</span>
              </div>
              <div v-if="getKeyValuePairs(field.field_key).length === 0" class="empty-keyvalue">
                —
              </div>
            </div>

            <div v-else class="field-value">{{ getFieldValue(field.field_key) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Lightbox -->
    <div v-if="lightboxImage" class="lightbox-overlay" @click="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox">&times;</button>
      <img :src="lightboxImage" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import type { MediaItemWithType } from "../../types/media";
import type { MediaTypeField } from "../../services/api";

const { t } = useI18n();

const lightboxImage = ref<string | null>(null);

function openLightbox(imageUrl: string) {
  lightboxImage.value = imageUrl;
}

function closeLightbox() {
  lightboxImage.value = null;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.show) {
    event.preventDefault();
    event.stopImmediatePropagation(); // Prevent other document listeners from firing

    if (lightboxImage.value) {
      closeLightbox();
    } else {
      handleClose();
    }
  }
}

function lockBodyScroll() {
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  document.body.style.overflow = "";
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown, true);
  if (props.show) {
    lockBodyScroll();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown, true);
  unlockBodyScroll();
});

const props = defineProps<{
  show: boolean;
  item: MediaItemWithType | null;
  itemFields: MediaTypeField[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "edit", item: MediaItemWithType): void;
}>();

const STANDARD_FIELDS = ["notes", "cover_image"];

function isStandardField(fieldKey: string): boolean {
  return STANDARD_FIELDS.includes(fieldKey);
}

function getFieldValue(fieldKey: string): string | number | boolean | undefined {
  if (!props.item) return undefined;
  if (isStandardField(fieldKey)) {
    return props.item[fieldKey] as string | number | boolean | undefined;
  }
  return props.item.attributes?.[fieldKey];
}

function getFieldValueAsString(fieldKey: string): string | undefined {
  const value = getFieldValue(fieldKey);
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function hasFieldValue(
  fieldKey: string,
  field?: { field_type?: string; options?: string }
): boolean {
  const value = getFieldValue(fieldKey);
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "string" && value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      if (field?.field_type === "checkbox" && field?.options) {
        const validOptions = JSON.parse(field.options);
        return Object.keys(parsed).some(
          (key) => parsed[key] === true && validOptions.includes(key)
        );
      }
      return Object.values(parsed).some((v) => v === true);
    } catch {
      return true;
    }
  }
  return true;
}

function isFieldValueTrue(fieldKey: string): boolean {
  const value = getFieldValue(fieldKey);
  return value === true || value === "true";
}

interface KeyValuePair {
  key: string;
  value: string;
}

function getKeyValuePairs(fieldKey: string): KeyValuePair[] {
  const value = getFieldValue(fieldKey);
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCheckedItems(fieldKey: string, fieldOptions?: string): string[] {
  const value = getFieldValue(fieldKey);
  if (!value || typeof value !== "string") return [];
  try {
    const state = JSON.parse(value);
    if (fieldOptions) {
      const validOptions = JSON.parse(fieldOptions);
      return validOptions.filter((option: string) => state[option] === true);
    }
    return Object.keys(state).filter((key) => state[key] === true);
  } catch {
    return [];
  }
}

function renderStars(rating: string | number | boolean | undefined): string {
  const numRating = parseFloat(String(rating)) || 0;
  const fullStars = Math.floor(numRating);
  const hasHalfStar = numRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return "★".repeat(fullStars) + (hasHalfStar ? "⯨" : "") + "☆".repeat(emptyStars);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function getRelativeBorrowDuration(dateString: string): string {
  const borrowDate = new Date(dateString);
  const now = new Date();

  let diffMs = now.getTime() - borrowDate.getTime();
  if (diffMs < 0) diffMs = 0;

  const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const years = Math.floor(totalDays / 365);
  const remainingAfterYears = totalDays % 365;
  const months = Math.floor(remainingAfterYears / 30);
  const remainingAfterMonths = remainingAfterYears % 30;
  const weeks = Math.floor(remainingAfterMonths / 7);
  const days = remainingAfterMonths % 7;

  const parts: string[] = [];

  if (years > 0) {
    parts.push(t("borrow.years", years));
  }
  if (months > 0) {
    parts.push(t("borrow.months", months));
  }
  if (weeks > 0) {
    parts.push(t("borrow.weeks", weeks));
  }
  if (days > 0 || parts.length === 0) {
    parts.push(t("borrow.days", days === 0 && parts.length === 0 ? 1 : days));
  }

  return t("borrow.borrowedFor") + " " + parts.join(", ");
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
}

function handleClose() {
  lightboxImage.value = null; // Reset lightbox when closing modal
  emit("close");
}

watch(
  () => props.show,
  (newVal: boolean) => {
    if (newVal) {
      lockBodyScroll();
    } else {
      lightboxImage.value = null;
      unlockBodyScroll();
    }
  }
);

function handleEdit() {
  if (props.item) {
    emit("edit", props.item);
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.detail-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 0;
  max-width: 1200px;
  width: 95%;
  max-height: 95%;
  overflow: hidden;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface);
  gap: var(--spacing-md);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.header-content h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.5rem;
  word-break: break-word;
}

.edit-btn {
  align-self: flex-start;
}

.detail-content {
  padding: var(--spacing-xl);
  overflow-y: auto;
  flex: 1;
}

.detail-meta {
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.detail-type {
  color: var(--color-text-subtle);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.borrow-info {
  margin-bottom: var(--spacing-lg);
  padding: 1rem;
  background: #fff3cd;
  border-radius: var(--radius-lg);
  border: 1px solid #ffe9a7;
  color: #6c4d00;
}

.dark-mode .borrow-info {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
  color: #fff4cc;
}

.borrow-duration {
  font-style: italic;
  opacity: 0.85;
  margin-top: 0.25em;
}

.detail-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.detail-field {
  border-bottom: 1px solid var(--color-border-light);
  padding-bottom: var(--spacing-md);
}

.detail-field:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.field-label {
  font-size: 0.85rem;
  color: var(--color-text-subtle);
  margin-bottom: var(--spacing-xs);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.field-value {
  color: var(--color-text);
  font-size: 1rem;
}

.field-image img {
  max-width: 100%;
  max-height: 300px;
  border-radius: var(--radius-md);
  object-fit: contain;
}

.field-value--multiline {
  white-space: pre-wrap;
}

.field-value--boolean {
  font-weight: 600;
}

.field-value--boolean-true {
  color: #1a9a7a;
}

.field-value--boolean-false {
  color: #c04a2e;
}

.dark-mode .field-value--boolean-true {
  color: #65d7bd;
}

.dark-mode .field-value--boolean-false {
  color: #ff9b72;
}

.field-value--rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.rating-stars {
  font-size: 1.25rem;
  color: #f4b400;
}

.rating-number {
  font-size: 0.9rem;
  color: var(--color-text-subtle);
}

.field-value--keyvalue {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.keyvalue-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0.5rem 0.75rem;
  background: var(--color-hover);
  border-radius: var(--radius-md);
}

.keyvalue-key {
  font-weight: 500;
  color: var(--color-text);
}

.keyvalue-separator {
  color: var(--color-text-subtle);
  font-size: 0.85rem;
}

.keyvalue-value {
  color: var(--color-text-muted);
}

.empty-keyvalue {
  color: var(--color-text-subtle);
}

.field-value--checkbox {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-hover);
  border-radius: var(--radius-sm);
  color: #1a9a7a;
  font-weight: 500;
  font-size: 0.9rem;
}

.dark-mode .checkbox-item {
  color: #65d7bd;
}

.empty-value {
  color: var(--color-text-subtle);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-available {
  background: #d4edda;
  color: #155724;
}

.badge-borrowed {
  background: #fff3cd;
  color: #856404;
}

.badge-lost {
  background: #f8d7da;
  color: #721c24;
}

.dark-mode .badge-available {
  background: rgba(40, 167, 69, 0.2);
  color: #65d7bd;
}

.dark-mode .badge-borrowed {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.dark-mode .badge-lost {
  background: rgba(220, 53, 69, 0.2);
  color: #ff9b72;
}

/* Clickable image */
.clickable-image {
  cursor: zoom-in;
  transition: opacity var(--transition-fast);
}

.clickable-image:hover {
  opacity: 0.9;
}

/* Lightbox */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: zoom-out;
}

.lightbox-image {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
  border-radius: var(--radius-md);
  cursor: default;
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 2.5rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  line-height: 1;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

@media (max-width: 600px) {
  .modal-header {
    padding: var(--spacing-md);
  }

  .header-content h2 {
    font-size: 1.1rem;
  }

  .detail-content {
    padding: var(--spacing-md);
  }
}
</style>
