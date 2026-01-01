<template>
  <div class="card" @click="handleClick">
    <div class="card-header">
      <div>
        <h3 class="card-title">{{ item.title }}</h3>
        <span class="badge" :class="`badge-${item.status}`">
          {{ t(`status.${item.status}`) }}
        </span>
      </div>
      <span class="card-type">{{ item.type_name }}</span>
    </div>

    <div v-if="item.status === 'borrowed'" class="borrow-info">
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

    <div v-for="field in itemFields" :key="field.id" class="item-field">
      <template v-if="hasFieldValue(field.field_key, field)">
        <strong>{{ field.field_label }}: </strong>
        <div v-if="field.field_type === 'image'" class="field-image">
          <img
            :src="getFieldValueAsString(field.field_key)"
            :alt="field.field_label"
            @error="handleImageError"
          />
        </div>
        <span
          v-else-if="field.field_type === 'boolean'"
          class="field-value field-value--boolean"
          :class="{
            'field-value--boolean-true': isFieldValueTrue(field.field_key),
            'field-value--boolean-false': !isFieldValueTrue(field.field_key),
          }"
        >
          {{ isFieldValueTrue(field.field_key) ? t("common.yes") : t("common.no") }}
        </span>
        <div v-else-if="field.field_type === 'checkbox'" class="field-value field-value--checkbox">
          <span
            v-for="item in getCheckedItems(field.field_key, field.options)"
            :key="item"
            class="checkbox-item"
          >
            ✓ {{ item }}
          </span>
        </div>
        <span v-else-if="field.field_type === 'radio'" class="field-value">
          {{ getFieldValue(field.field_key) }}
        </span>
        <span v-else-if="field.field_type === 'rating'" class="field-value field-value--rating">
          <span class="rating-stars">{{ renderStars(getFieldValue(field.field_key)) }}</span>
        </span>
        <span
          v-else-if="field.field_type === 'textarea'"
          class="field-value field-value--multiline"
        >
          {{ getFieldValue(field.field_key) }}
        </span>
        <div v-else-if="field.field_type === 'keyvalue'" class="field-value field-value--keyvalue">
          <div
            v-for="(pair, index) in getTruncatedKeyValuePairs(field.field_key)"
            :key="index"
            class="keyvalue-item-inline"
          >
            <template v-if="pair.key && pair.value">
              <span class="kv-key">{{ pair.key }}</span>
              <span class="kv-arrow">→</span>
              <span class="kv-value">{{ pair.value }}</span>
            </template>
            <template v-else-if="pair.key">
              <span class="kv-key">{{ pair.key }}</span>
            </template>
            <template v-else-if="pair.value">
              <span class="kv-value">{{ pair.value }}</span>
            </template>
          </div>
          <div
            v-if="getKeyValuePairsCount(field.field_key) > maxKeyValueDisplay"
            class="keyvalue-more"
          >
            {{
              t("keyvalue.showMore", {
                count: getKeyValuePairsCount(field.field_key) - maxKeyValueDisplay,
              })
            }}
          </div>
        </div>
        <span v-else class="field-value">{{ getFieldValue(field.field_key) }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { MediaItemWithType } from "../../types/media";
import type { MediaTypeField } from "../../services/api";

const { t } = useI18n();

const props = defineProps<{
  item: MediaItemWithType;
  itemFields: MediaTypeField[];
}>();

const emit = defineEmits<{
  (e: "click", item: MediaItemWithType): void;
}>();

const STANDARD_FIELDS = ["notes", "cover_image"];
const maxKeyValueDisplay = 3;

function isStandardField(fieldKey: string): boolean {
  return STANDARD_FIELDS.includes(fieldKey);
}

function getFieldValue(fieldKey: string): string | number | boolean | undefined {
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
  if (typeof value === "string" && value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return true;
    }
  }
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
  key: string | null;
  value: string | null;
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

function getTruncatedKeyValuePairs(fieldKey: string): KeyValuePair[] {
  return getKeyValuePairs(fieldKey).slice(0, maxKeyValueDisplay);
}

function getKeyValuePairsCount(fieldKey: string): number {
  return getKeyValuePairs(fieldKey).length;
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

function handleClick() {
  emit("click", props.item);
}
</script>

<style scoped>
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--shadow-md);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
  position: relative;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.dark-mode .card {
  border: 1px solid var(--color-border);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.card-header > div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.card-title {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--color-text);
}

.card-type {
  color: var(--color-text-subtle);
  font-size: 0.9rem;
  margin-top: 0.15em;
}

.borrow-info {
  margin-bottom: var(--spacing-md);
  padding: 0.85rem;
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

.item-field {
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.item-field strong {
  color: var(--color-text);
}

.field-value {
  color: var(--color-text);
}

.field-image {
  margin-top: var(--spacing-sm);
}

.field-image img {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius-sm);
  object-fit: contain;
}

.field-value--multiline {
  white-space: pre-wrap;
  color: var(--color-text);
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

.field-value--keyvalue {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.keyvalue-item-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-hover);
  border-radius: var(--radius-sm);
}

.kv-key {
  font-weight: 500;
  color: var(--color-text);
}

.kv-arrow {
  color: var(--color-text-subtle);
  font-size: 0.8rem;
}

.kv-value {
  color: var(--color-text-muted);
}

.keyvalue-more {
  font-size: 0.85rem;
  color: var(--color-primary);
  font-weight: 500;
  padding-top: 0.25rem;
}

.field-value--checkbox {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  padding: 0.2rem 0.5rem;
  background: var(--color-hover);
  border-radius: var(--radius-sm);
  color: #1a9a7a;
}

.dark-mode .checkbox-item {
  color: #65d7bd;
}
</style>
