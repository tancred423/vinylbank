<template>
  <div v-if="show" class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal">
      <div class="modal-header">
        <div class="header-content">
          <h2>{{ isEditing ? t("collection.editItem") : t("collection.addItem") }}</h2>
          <div class="header-actions">
            <button type="submit" form="item-form" class="btn btn-primary btn-sm">
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
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {{ t("common.save") }}
            </button>
            <button type="button" class="btn btn-secondary btn-sm" @click="handleClose">
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
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              {{ t("common.cancel") }}
            </button>
            <button
              v-if="isEditing"
              type="button"
              class="btn btn-danger btn-sm"
              @click="handleDelete"
              :title="t('collection.deleteItem')"
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
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
              </svg>
              {{ t("collection.deleteItem") }}
            </button>
          </div>
        </div>
        <button class="close-btn" @click="handleClose">&times;</button>
      </div>

      <form id="item-form" @submit.prevent="handleSave">
        <div class="form-group">
          <label for="type">{{ t("item.type") }} *</label>
          <div v-if="isEditing" class="type-change-hint">
            ⚠️ {{ t("collection.typeChangeHint") }}
          </div>
          <select id="type" v-model="localFormData.type_id" required>
            <option value="">{{ t("item.type") }}</option>
            <option v-for="type in mediaTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="title">{{ t("item.title") }} *</label>
          <input id="title" v-model="localFormData.title" type="text" required />
        </div>

        <div class="form-group">
          <label for="status">{{ t("item.status") }} *</label>
          <select id="status" v-model="localFormData.status" required>
            <option value="available">{{ t("status.available") }}</option>
            <option value="borrowed">{{ t("status.borrowed") }}</option>
            <option value="lost">{{ t("status.lost") }}</option>
          </select>
        </div>

        <div v-if="localFormData.status === 'borrowed'" class="form-row">
          <div class="form-group">
            <label for="borrowed_by">{{ t("item.borrowedBy") }}</label>
            <input id="borrowed_by" v-model="localFormData.borrowed_by" type="text" />
          </div>

          <div class="form-group">
            <label for="borrowed_date">{{ t("item.borrowedDate") }}</label>
            <input
              id="borrowed_date"
              v-model="localFormData.borrowed_date"
              type="date"
              class="date-input"
            />
          </div>
        </div>

        <div v-if="currentTypeFields.length > 0">
          <div v-for="field in currentTypeFields" :key="field.id" class="form-group">
            <label :for="`field-${field.field_key}`">
              {{ field.field_label }}
              <span v-if="field.required" style="color: #dc3545">*</span>
            </label>

            <input
              v-if="field.field_type === 'text'"
              :id="`field-${field.field_key}`"
              :value="getFieldValue(field.field_key)"
              @input="setFieldValue(field.field_key, ($event.target as HTMLInputElement).value)"
              type="text"
              :required="field.required"
            />

            <input
              v-else-if="field.field_type === 'number'"
              :id="`field-${field.field_key}`"
              :value="getFieldValue(field.field_key) ?? 0"
              @input="setFieldValue(field.field_key, ($event.target as HTMLInputElement).value)"
              type="number"
              :required="field.required"
              placeholder="0"
            />

            <input
              v-else-if="field.field_type === 'date'"
              :id="`field-${field.field_key}`"
              :value="getFieldValue(field.field_key) || getCurrentDate()"
              @change="setFieldValue(field.field_key, ($event.target as HTMLInputElement).value)"
              type="date"
              :required="field.required"
              class="date-input"
            />

            <textarea
              v-else-if="field.field_type === 'textarea'"
              :id="`field-${field.field_key}`"
              :value="getFieldValueAsString(field.field_key)"
              @input="setFieldValue(field.field_key, ($event.target as HTMLTextAreaElement).value)"
              :required="field.required"
              rows="3"
            ></textarea>

            <select
              v-else-if="field.field_type === 'select'"
              :id="`field-${field.field_key}`"
              :value="getFieldValue(field.field_key)"
              @change="setFieldValue(field.field_key, ($event.target as HTMLSelectElement).value)"
              :required="field.required"
            >
              <option value="">{{ t("common.select") }}</option>
              <option
                v-for="option in field.options ? JSON.parse(field.options) : []"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>

            <label v-else-if="field.field_type === 'boolean'" class="checkbox-label">
              <input
                :id="`field-${field.field_key}`"
                :checked="
                  getFieldValue(field.field_key) === true ||
                  getFieldValue(field.field_key) === 'true'
                "
                @change="
                  setFieldValue(field.field_key, ($event.target as HTMLInputElement).checked)
                "
                type="checkbox"
                :required="field.required"
                class="checkbox-input"
              />
              <span>{{ t("common.yes") }}</span>
            </label>

            <div v-else-if="field.field_type === 'checkbox'" class="checkbox-group">
              <label v-for="option in getFieldOptions(field)" :key="option" class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isCheckboxChecked(field.field_key, option)"
                  @change="
                    toggleCheckbox(
                      field.field_key,
                      option,
                      ($event.target as HTMLInputElement).checked
                    )
                  "
                  class="checkbox-input"
                />
                <span>{{ option }}</span>
              </label>
            </div>

            <div v-else-if="field.field_type === 'radio'" class="radio-group">
              <label v-for="option in getFieldOptions(field)" :key="option" class="radio-label">
                <input
                  type="radio"
                  :name="`field-${field.field_key}`"
                  :value="option"
                  :checked="getFieldValue(field.field_key) === option"
                  @change="setFieldValue(field.field_key, option)"
                  class="radio-input"
                />
                <span>{{ option }}</span>
              </label>
            </div>

            <div v-else-if="field.field_type === 'rating'" class="rating-input">
              <fieldset class="rate">
                <input
                  type="radio"
                  :id="`${field.field_key}-rating5`"
                  :name="`${field.field_key}-rating`"
                  :value="5"
                  v-model.number="localFormData.attributes![field.field_key]"
                />
                <label
                  :for="`${field.field_key}-rating5`"
                  :title="t('rating.stars', { count: 5 })"
                ></label>

                <input
                  type="radio"
                  :id="`${field.field_key}-rating4`"
                  :name="`${field.field_key}-rating`"
                  :value="4"
                  v-model.number="localFormData.attributes![field.field_key]"
                />
                <label
                  :for="`${field.field_key}-rating4`"
                  :title="t('rating.stars', { count: 4 })"
                ></label>

                <input
                  type="radio"
                  :id="`${field.field_key}-rating3`"
                  :name="`${field.field_key}-rating`"
                  :value="3"
                  v-model.number="localFormData.attributes![field.field_key]"
                />
                <label
                  :for="`${field.field_key}-rating3`"
                  :title="t('rating.stars', { count: 3 })"
                ></label>

                <input
                  type="radio"
                  :id="`${field.field_key}-rating2`"
                  :name="`${field.field_key}-rating`"
                  :value="2"
                  v-model.number="localFormData.attributes![field.field_key]"
                />
                <label
                  :for="`${field.field_key}-rating2`"
                  :title="t('rating.stars', { count: 2 })"
                ></label>

                <input
                  type="radio"
                  :id="`${field.field_key}-rating1`"
                  :name="`${field.field_key}-rating`"
                  :value="1"
                  v-model.number="localFormData.attributes![field.field_key]"
                />
                <label
                  :for="`${field.field_key}-rating1`"
                  :title="t('rating.stars', { count: 1 })"
                ></label>

                <button
                  v-if="!field.required || getFieldValue(field.field_key)"
                  type="button"
                  class="clear-rating-btn"
                  @click="setFieldValue(field.field_key, '')"
                  :title="t('rating.clear')"
                >
                  ✕
                </button>
              </fieldset>
              <span class="rating-value">{{ getFieldValue(field.field_key) || "0" }} / 5</span>
            </div>

            <div v-else-if="field.field_type === 'image'" class="image-upload-container">
              <input
                v-if="!getFieldValue(field.field_key)"
                :id="`field-${field.field_key}`"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                @change="(e) => handleFieldImageUpload(e, field.field_key)"
              />
              <div v-else class="image-preview">
                <img :src="getFieldValueAsString(field.field_key)" :alt="field.field_label" />
                <button
                  type="button"
                  class="image-remove-btn"
                  @click="setFieldValue(field.field_key, '')"
                  :title="t('image.remove')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>

            <div v-else-if="field.field_type === 'keyvalue'" class="keyvalue-container">
              <div
                v-for="(pair, index) in getKeyValuePairs(field.field_key)"
                :key="index"
                class="keyvalue-row"
              >
                <input
                  type="text"
                  :value="pair.key"
                  @input="
                    updateKeyValuePair(
                      field.field_key,
                      index,
                      'key',
                      ($event.target as HTMLInputElement).value
                    )
                  "
                  :placeholder="t('keyvalue.keyPlaceholder')"
                  class="keyvalue-input"
                />
                <input
                  type="text"
                  :value="pair.value"
                  @input="
                    updateKeyValuePair(
                      field.field_key,
                      index,
                      'value',
                      ($event.target as HTMLInputElement).value
                    )
                  "
                  :placeholder="t('keyvalue.valuePlaceholder')"
                  class="keyvalue-input"
                />
                <button
                  type="button"
                  class="keyvalue-remove-btn"
                  @click="removeKeyValuePair(field.field_key, index)"
                  :title="t('keyvalue.removePair')"
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
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    ></path>
                  </svg>
                </button>
              </div>
              <button
                type="button"
                class="keyvalue-add-btn"
                @click="addKeyValuePair(field.field_key)"
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
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {{ t("keyvalue.addPair") }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { MediaItem, MediaType } from "../../types/media";
import type { MediaTypeConfig } from "../../services/api";

const { t } = useI18n();

const props = defineProps<{
  show: boolean;
  formData: Partial<MediaItem> & { attributes?: Record<string, string | number | boolean> };
  mediaTypes: MediaType[];
  typeConfigs: MediaTypeConfig[];
  isEditing: boolean;
  hasChanges: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "save",
    formData: Partial<MediaItem> & { attributes?: Record<string, string | number | boolean> }
  ): void;
  (e: "delete"): void;
  (e: "field-image-upload", event: Event, fieldKey: string): void;
}>();

const localFormData = ref(props.formData);

watch(
  () => props.formData,
  (newData) => {
    localFormData.value = newData;
  },
  { deep: true }
);

const STANDARD_FIELDS = ["notes", "cover_image"];

const currentTypeFields = computed(() => {
  if (!localFormData.value.type_id) return [];
  const config = props.typeConfigs.find((t) => t.id === localFormData.value.type_id);
  if (!config) return [];
  return config.fields.sort((a, b) => a.display_order - b.display_order);
});

function isStandardField(fieldKey: string): boolean {
  return STANDARD_FIELDS.includes(fieldKey);
}

function getFieldValue(fieldKey: string): string | number | boolean | undefined {
  if (isStandardField(fieldKey)) {
    return localFormData.value[fieldKey] as string | number | boolean | undefined;
  }
  return localFormData.value.attributes?.[fieldKey];
}

function getFieldValueAsString(fieldKey: string): string {
  const value = getFieldValue(fieldKey);
  if (value === undefined || value === null) return "";
  return String(value);
}

function setFieldValue(fieldKey: string, value: string | number | boolean) {
  if (isStandardField(fieldKey)) {
    localFormData.value[fieldKey] = value;
  } else {
    if (!localFormData.value.attributes) {
      localFormData.value.attributes = {};
    }
    localFormData.value.attributes[fieldKey] = value;
  }
}

function getCurrentDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function handleOverlayClick() {
  if (!props.hasChanges) {
    handleClose();
  }
}

function handleClose() {
  emit("close");
}

function handleSave() {
  emit("save", localFormData.value);
}

function handleDelete() {
  emit("delete");
}

function handleFieldImageUpload(event: Event, fieldKey: string) {
  emit("field-image-upload", event, fieldKey);
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

function setKeyValuePairs(fieldKey: string, pairs: KeyValuePair[]) {
  setFieldValue(fieldKey, JSON.stringify(pairs));
}

function addKeyValuePair(fieldKey: string) {
  const pairs = getKeyValuePairs(fieldKey);
  pairs.push({ key: "", value: "" });
  setKeyValuePairs(fieldKey, pairs);
}

function removeKeyValuePair(fieldKey: string, index: number) {
  const pairs = getKeyValuePairs(fieldKey);
  pairs.splice(index, 1);
  setKeyValuePairs(fieldKey, pairs);
}

function updateKeyValuePair(
  fieldKey: string,
  index: number,
  prop: "key" | "value",
  newValue: string
) {
  const pairs = getKeyValuePairs(fieldKey);
  if (pairs[index]) {
    pairs[index][prop] = newValue;
    setKeyValuePairs(fieldKey, pairs);
  }
}

function getFieldOptions(field: { options?: string }): string[] {
  if (!field.options) return [];
  try {
    return JSON.parse(field.options);
  } catch {
    return [];
  }
}

interface CheckboxState {
  [key: string]: boolean;
}

function getCheckboxState(fieldKey: string): CheckboxState {
  const value = getFieldValue(fieldKey);
  if (!value || typeof value !== "string") return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function isCheckboxChecked(fieldKey: string, option: string): boolean {
  const state = getCheckboxState(fieldKey);
  return state[option] === true;
}

function toggleCheckbox(fieldKey: string, option: string, checked: boolean) {
  const state = getCheckboxState(fieldKey);
  state[option] = checked;
  setFieldValue(fieldKey, JSON.stringify(state));
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

.modal {
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
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.modal-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.header-actions .btn-sm {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}

form {
  padding: var(--spacing-xl);
  overflow-y: auto;
  flex: 1;
}

@media (max-width: 600px) {
  .modal-header {
    padding: var(--spacing-md);
  }

  .modal-header h2 {
    font-size: 1.1rem;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn-sm {
    flex: 1;
    justify-content: center;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }

  form {
    padding: var(--spacing-md);
  }
}

.keyvalue-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.keyvalue-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.keyvalue-input {
  flex: 1;
  padding: 0.6rem var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  background: var(--color-surface);
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.keyvalue-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.keyvalue-remove-btn {
  flex-shrink: 0;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.keyvalue-remove-btn:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.keyvalue-add-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 0.5rem var(--spacing-md);
  border: 1px dashed var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all var(--transition-fast);
  align-self: flex-start;
}

.keyvalue-add-btn:hover {
  border-color: var(--color-primary);
  border-style: solid;
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.checkbox-group,
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.checkbox-label:hover,
.radio-label:hover {
  background: var(--color-hover);
}

.radio-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.type-change-hint {
  margin-bottom: var(--spacing-xs);
  padding: 0.5rem 0.75rem;
  background: #fff3cd;
  border-radius: var(--radius-sm);
  color: #664d03;
  font-size: 0.85rem;
}

.dark-mode .type-change-hint {
  background: rgba(255, 193, 7, 0.15);
  color: #ffda6a;
}
</style>
