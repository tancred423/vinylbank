<template>
  <div class="container">
    <div class="config-view">
      <div class="config-header">
        <h2>{{ t("config.title") }}</h2>
        <button class="btn btn-primary" @click="openAddTypeModal">
          + {{ t("config.addType") }}
        </button>
      </div>

      <div v-if="loading" style="text-align: center; padding: 2rem">{{ t("app.loading") }}</div>

      <div v-else class="type-configs">
        <div
          v-for="typeConfig in typeConfigs"
          :key="typeConfig.id"
          class="card"
          style="margin-bottom: 2rem"
        >
          <div class="type-header">
            <div class="type-actions">
              <h3>{{ typeConfig.name }}</h3>
              <button
                class="btn-icon"
                @click="openEditTypeModal(typeConfig)"
                :title="t('config.editType')"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
                <div class="button-label">{{ t("config.editType") }}</div>
              </button>
              <button
                class="btn-icon btn-icon--danger"
                @click="deleteType(typeConfig.id)"
                :disabled="typeConfig.fields.length > 0"
                :title="t('config.deleteType')"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
                <div class="button-label">{{ t("config.deleteType") }}</div>
              </button>
            </div>
            <div class="type-actions">
              <button
                class="btn-icon btn-icon--primary"
                @click="openAddFieldModal(typeConfig)"
                :title="t('config.addField')"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
                <div class="button-label">{{ t("config.addField") }}</div>
              </button>
            </div>
          </div>

          <p class="fields-hint">{{ t("config.defaultFieldsHint") }}</p>

          <div v-if="typeConfig.fields.length === 0" class="empty-state" style="padding: 1rem">
            <p>{{ t("config.noFields") }}</p>
          </div>

          <div v-else class="fields-list">
            <template v-for="field in getSortedFields(typeConfig)" :key="field.id">
              <!-- Drop placeholder shown before the target field -->
              <div
                v-if="dragOverField?.id === field.id && draggedField?.id !== field.id"
                class="drop-placeholder"
                @dragover.prevent="handleDragOver($event, field)"
                @drop="handleDrop($event, field, typeConfig)"
              >
                {{ t("config.dropHere") }}
              </div>

              <div
                class="field-item"
                draggable="true"
                @dragstart="handleDragStart($event, field, typeConfig)"
                @dragover.prevent="handleDragOver($event, field)"
                @dragleave="handleDragLeave($event)"
                @drop="handleDrop($event, field, typeConfig)"
                @dragend="handleDragEnd"
                :class="{
                  dragging: draggedField?.id === field.id,
                }"
              >
                <div class="drag-handle" :title="t('config.dragToReorder')">
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
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </div>
                <div class="field-info">
                  <div class="field-label">{{ field.field_label }}</div>
                  <div class="field-meta">
                    <span class="badge badge-available">{{
                      t("fieldTypes." + field.field_type)
                    }}</span>
                    <span v-if="field.required" class="badge badge-borrowed">{{
                      t("common.required")
                    }}</span>
                  </div>
                </div>
                <div class="field-actions">
                  <button
                    class="btn-icon"
                    @click="openEditFieldModal(field, typeConfig)"
                    :title="t('config.editField')"
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
                    <div class="button-label">{{ t("config.editField") }}</div>
                  </button>
                  <button
                    class="btn-icon btn-icon--danger"
                    @click="deleteField(field.id!)"
                    :title="t('config.deleteField')"
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
                    <div class="button-label">{{ t("config.deleteField") }}</div>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Add/Edit Type Modal -->
      <div v-if="showTypeModal" class="modal-overlay" @click.self="closeTypeModalIfNoChanges">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingType ? t("config.editType") : t("config.addType") }}</h2>
            <button class="close-btn" @click="closeTypeModal">&times;</button>
          </div>
          <form @submit.prevent="saveType">
            <div class="form-group">
              <label for="type-name">{{ t("config.typeName") }} *</label>
              <input id="type-name" v-model="typeFormData.name" type="text" required />
            </div>
            <div class="actions">
              <button type="submit" class="btn btn-primary">
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
              <button type="button" class="btn btn-secondary" @click="closeTypeModal">
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
            </div>
          </form>
        </div>
      </div>

      <!-- Add/Edit Field Modal -->
      <div v-if="showFieldModal" class="modal-overlay" @click.self="closeFieldModalIfNoChanges">
        <div class="modal" style="max-width: 700px">
          <div class="modal-header">
            <h2>
              {{ editingField ? t("config.editField") : t("config.addField") }} -
              {{ currentTypeConfig?.name }}
            </h2>
            <button class="close-btn" @click="closeFieldModal">&times;</button>
          </div>
          <form @submit.prevent="saveField">
            <div class="form-group">
              <label for="field-label">{{ t("config.fieldLabel") }} *</label>
              <input id="field-label" v-model="fieldFormData.field_label" type="text" required />
            </div>

            <div class="form-group">
              <label for="field-type">{{ t("config.fieldType") }} *</label>
              <select id="field-type" v-model="fieldFormData.field_type" required>
                <option value="text">{{ t("fieldTypes.text") }}</option>
                <option value="number">{{ t("fieldTypes.number") }}</option>
                <option value="date">{{ t("fieldTypes.date") }}</option>
                <option value="textarea">{{ t("fieldTypes.textarea") }}</option>
                <option value="select">{{ t("fieldTypes.select") }}</option>
                <option value="checkbox">{{ t("fieldTypes.checkbox") }}</option>
                <option value="radio">{{ t("fieldTypes.radio") }}</option>
                <option value="image">{{ t("fieldTypes.image") }}</option>
                <option value="rating">{{ t("fieldTypes.rating") }}</option>
                <option value="keyvalue">{{ t("fieldTypes.keyvalue") }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="fieldFormData.required" class="checkbox-input" />
                <span>{{ t("config.fieldRequired") }}</span>
              </label>
            </div>

            <div v-if="fieldFormData.field_type === 'select'" class="form-group">
              <label for="field-options">{{ t("config.fieldOptions") }} *</label>
              <textarea
                id="field-options"
                v-model="fieldOptionsText"
                rows="5"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                required
              ></textarea>
              <small style="color: #666">{{ t("config.optionsHint") }}</small>
            </div>

            <div v-if="fieldFormData.field_type === 'checkbox'" class="form-group">
              <label for="checkbox-options">{{ t("config.checkboxOptions") }} *</label>
              <textarea
                id="checkbox-options"
                v-model="fieldOptionsText"
                rows="5"
                placeholder="Checkbox 1&#10;Checkbox 2&#10;Checkbox 3"
                required
              ></textarea>
              <small style="color: #666">{{ t("config.checkboxOptionsHint") }}</small>
            </div>

            <div v-if="fieldFormData.field_type === 'radio'" class="form-group">
              <label for="radio-options">{{ t("config.radioOptions") }} *</label>
              <textarea
                id="radio-options"
                v-model="fieldOptionsText"
                rows="5"
                placeholder="Option A&#10;Option B&#10;Option C"
                required
              ></textarea>
              <small style="color: #666">{{ t("config.radioOptionsHint") }}</small>
            </div>

            <div class="actions">
              <button type="submit" class="btn btn-primary">
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
              <button type="button" class="btn btn-secondary" @click="closeFieldModal">
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
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { configApi, type MediaTypeConfig, type MediaTypeField } from "../services/api";

const { t } = useI18n();

const emit = defineEmits<{
  (e: "types-updated"): void;
}>();

const typeConfigs = ref<MediaTypeConfig[]>([]);
const loading = ref(true);
const showTypeModal = ref(false);
const showFieldModal = ref(false);
const editingType = ref<MediaTypeConfig | null>(null);
const editingField = ref<MediaTypeField | null>(null);
const currentTypeConfig = ref<MediaTypeConfig | null>(null);

const typeFormHasChanges = ref(false);
const fieldFormHasChanges = ref(false);
const initialTypeFormData = ref("");
const initialFieldFormData = ref("");

const typeFormData = ref({ name: "" });
const fieldFormData = ref({
  field_key: "",
  field_label: "",
  field_type: "text" as MediaTypeField["field_type"],
  required: false,
  display_order: 0,
});

const fieldOptionsText = ref("");

const draggedField = ref<MediaTypeField | null>(null);
const dragOverField = ref<MediaTypeField | null>(null);
const draggedFromConfig = ref<MediaTypeConfig | null>(null);

watch(
  typeFormData,
  () => {
    if (showTypeModal.value) {
      const currentFormData = JSON.stringify(typeFormData.value);
      typeFormHasChanges.value = currentFormData !== initialTypeFormData.value;
    }
  },
  { deep: true }
);

watch(
  fieldFormData,
  () => {
    if (showFieldModal.value) {
      const currentFormData = JSON.stringify(fieldFormData.value);
      fieldFormHasChanges.value = currentFormData !== initialFieldFormData.value;
    }
  },
  { deep: true }
);

function getSortedFields(typeConfig: MediaTypeConfig) {
  return [...typeConfig.fields].sort((a, b) => a.display_order - b.display_order);
}

function handleDragStart(event: DragEvent, field: MediaTypeField, typeConfig: MediaTypeConfig) {
  draggedField.value = field;
  draggedFromConfig.value = typeConfig;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleDragOver(_event: DragEvent, field: MediaTypeField) {
  if (draggedField.value && draggedField.value.id !== field.id) {
    dragOverField.value = field;
  }
}

function handleDragLeave(event: DragEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".field-item")) {
    dragOverField.value = null;
  }
}

async function handleDrop(
  event: DragEvent,
  targetField: MediaTypeField,
  typeConfig: MediaTypeConfig
) {
  event.preventDefault();
  event.stopPropagation();
  dragOverField.value = null;

  if (!draggedField.value || draggedField.value.id === targetField.id) {
    return;
  }

  try {
    const fields = getSortedFields(typeConfig);
    const draggedIndex = fields.findIndex((f) => f.id === draggedField.value!.id);
    const targetIndex = fields.findIndex((f) => f.id === targetField.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reorderedFields = [...fields];
    const [removed] = reorderedFields.splice(draggedIndex, 1);
    reorderedFields.splice(targetIndex, 0, removed);

    reorderedFields.forEach((field, index) => {
      field.display_order = index;
    });

    const configIndex = typeConfigs.value.findIndex((c) => c.id === typeConfig.id);
    if (configIndex !== -1) {
      typeConfigs.value[configIndex].fields = reorderedFields;
    }

    const updates = reorderedFields.map((field, index) => ({
      id: field.id!,
      display_order: index,
    }));

    for (const update of updates) {
      await configApi.updateField(update.id, { display_order: update.display_order });
    }

    emit("types-updated");
  } catch (error) {
    console.error("Failed to reorder fields:", error);
    alert(t("errors.reorderFailed"));

    await loadConfigs();
  }
}

function handleDragEnd() {
  draggedField.value = null;
  dragOverField.value = null;
  draggedFromConfig.value = null;
}

function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, 60);
}

function generateUniqueFieldKey(baseKey: string): string {
  const sanitized = baseKey || "field";
  const fields = currentTypeConfig.value?.fields || [];
  let candidate = sanitized;
  let counter = 1;
  const isDuplicate = (key: string) =>
    fields.some(
      (f) => f.field_key === key && (!editingField.value || f.id !== editingField.value.id)
    );

  while (!candidate || isDuplicate(candidate)) {
    candidate = `${sanitized}_${counter++}`;
  }

  return candidate;
}

watch(
  () => fieldFormData.value.field_label,
  (newLabel) => {
    if (!editingField.value && newLabel) {
      generateFieldKey();
    }
  }
);

onMounted(async () => {
  await loadConfigs();
  document.addEventListener("keydown", handleEscapeKey);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleEscapeKey);
});

async function loadConfigs(preserveScroll = false) {
  const scrollY = preserveScroll ? window.scrollY : 0;

  try {
    loading.value = true;
    typeConfigs.value = await configApi.getTypeConfigs();

    if (preserveScroll) {
      await nextTick();
      setTimeout(() => {
        window.scrollTo({ top: scrollY, behavior: "instant" });
      }, 0);
    }
  } catch (error) {
    console.error("Failed to load configs:", error);
    alert(t("errors.loadFailed"));
  } finally {
    loading.value = false;
  }
}

function openAddTypeModal() {
  editingType.value = null;
  typeFormData.value = { name: "" };
  initialTypeFormData.value = JSON.stringify(typeFormData.value);
  typeFormHasChanges.value = false;
  showTypeModal.value = true;
}

function openEditTypeModal(type: MediaTypeConfig) {
  editingType.value = type;
  typeFormData.value = { name: type.name };
  initialTypeFormData.value = JSON.stringify(typeFormData.value);
  typeFormHasChanges.value = false;
  showTypeModal.value = true;
}

function closeTypeModalIfNoChanges() {
  if (typeFormHasChanges.value) {
    return;
  }
  closeTypeModal();
}

function closeTypeModal() {
  showTypeModal.value = false;
  editingType.value = null;
  typeFormHasChanges.value = false;
  initialTypeFormData.value = "";
}

async function saveType() {
  try {
    if (editingType.value) {
      await configApi.updateType(editingType.value.id, typeFormData.value.name);
    } else {
      await configApi.createType(typeFormData.value.name);
    }
    await loadConfigs(true);
    emit("types-updated");
    closeTypeModal();
  } catch (error) {
    console.error("Failed to save type:", error);
    alert(t("errors.saveFailed"));
  }
}

async function deleteType(id: number) {
  if (!confirm(t("config.confirmDeleteType"))) {
    return;
  }

  try {
    await configApi.deleteType(id);
    await loadConfigs(true);
  } catch (error) {
    const err = error as { response?: { data?: { error?: string } } };
    console.error("Failed to delete type:", error);
    alert(err.response?.data?.error || t("errors.deleteTypeFailed"));
  }
}

function openAddFieldModal(typeConfig: MediaTypeConfig) {
  editingField.value = null;
  currentTypeConfig.value = typeConfig;
  fieldFormData.value = {
    field_key: "",
    field_label: "",
    field_type: "text",
    required: false,
    display_order: typeConfig.fields.length,
  };
  fieldOptionsText.value = "";
  if (fieldFormData.value.field_label) {
    generateFieldKey();
  } else {
    fieldFormData.value.field_key = generateUniqueFieldKey("field");
  }
  initialFieldFormData.value = JSON.stringify(fieldFormData.value);
  fieldFormHasChanges.value = false;
  showFieldModal.value = true;
}

function generateFieldKey() {
  if (editingField.value || !currentTypeConfig.value) return;
  const baseKey = slugifyKey(fieldFormData.value.field_label);
  fieldFormData.value.field_key = generateUniqueFieldKey(baseKey || "field");
}

function openEditFieldModal(field: MediaTypeField, typeConfig: MediaTypeConfig) {
  editingField.value = field;
  currentTypeConfig.value = typeConfig;
  fieldFormData.value = {
    field_key: field.field_key,
    field_label: field.field_label,
    field_type: field.field_type,
    required: field.required,
    display_order: field.display_order,
  };
  fieldOptionsText.value = field.options ? JSON.parse(field.options).join("\n") : "";
  initialFieldFormData.value = JSON.stringify(fieldFormData.value);
  fieldFormHasChanges.value = false;
  showFieldModal.value = true;
}

function closeFieldModalIfNoChanges() {
  if (fieldFormHasChanges.value) {
    return;
  }
  closeFieldModal();
}

function closeFieldModal() {
  showFieldModal.value = false;
  editingField.value = null;
  currentTypeConfig.value = null;
  fieldFormHasChanges.value = false;
  initialFieldFormData.value = "";
}

async function saveField() {
  try {
    if (!currentTypeConfig.value) return;

    if (!fieldFormData.value.field_key && fieldFormData.value.field_label) {
      generateFieldKey();
    }

    if (!fieldFormData.value.field_key || !fieldFormData.value.field_label) {
      alert(t("errors.fieldLabelRequired"));
      return;
    }

    const fieldData: {
      field_key: string;
      field_label: string;
      field_type: MediaTypeField["field_type"];
      required: boolean;
      display_order: number;
      options?: string;
    } = {
      ...fieldFormData.value,
    };

    if (fieldFormData.value.field_type === "select") {
      const options = fieldOptionsText.value
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (options.length === 0) {
        alert(t("errors.selectOptionsRequired"));
        return;
      }
      fieldData.options = JSON.stringify(options);
    }

    if (
      fieldFormData.value.field_type === "checkbox" ||
      fieldFormData.value.field_type === "radio"
    ) {
      const options = fieldOptionsText.value
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (options.length === 0) {
        alert(t("errors.selectOptionsRequired"));
        return;
      }
      fieldData.options = JSON.stringify(options);
    }

    if (editingField.value) {
      await configApi.updateField(editingField.value.id!, fieldData);
    } else {
      await configApi.addField(currentTypeConfig.value.id, fieldData);
    }

    await loadConfigs(true);
    emit("types-updated");
    closeFieldModal();
  } catch (error) {
    const err = error as { response?: { data?: { error?: string } } };
    console.error("Failed to save field:", error);
    alert(err.response?.data?.error || t("errors.saveFailed"));
  }
}

async function deleteField(id: number) {
  if (!confirm(t("config.confirmDeleteField"))) {
    return;
  }

  try {
    await configApi.deleteField(id);
    await loadConfigs(true);
  } catch (error) {
    console.error("Failed to delete field:", error);
    alert(t("errors.deleteFailed"));
  }
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (showFieldModal.value) {
      closeFieldModal();
    } else if (showTypeModal.value) {
      closeTypeModal();
    }
  }
}
</script>

<style scoped>
.config-header {
  margin-bottom: var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.config-header h2 {
  margin: 0;
  color: var(--color-text);
}

.type-configs {
  display: flex;
  flex-direction: column;
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.type-header h3 {
  margin: 0;
  color: var(--color-text);
}

.fields-hint {
  font-size: 0.85rem;
  color: var(--color-text-subtle);
  margin: 0 0 var(--spacing-md) 0;
  font-style: italic;
}

.type-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.field-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.fields-list {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.field-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: move;
  transition: all var(--transition-fast);
}

.field-item:hover {
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.field-item.dragging {
  opacity: 0.4;
  cursor: grabbing;
}

.drop-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-primary-light);
  border: 2px dashed var(--color-primary);
  border-radius: var(--radius-md);
  color: var(--color-primary);
  font-weight: 500;
  min-height: 52px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.drag-handle {
  flex-shrink: 0;
  color: var(--color-text-subtle);
  cursor: grab;
  display: flex;
  align-items: center;
  padding: var(--spacing-xs);
}

.drag-handle:active {
  cursor: grabbing;
}

.field-info {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 10px;
}

.field-label {
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.field-meta {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.dark-mode .field-item {
  background: #2a2a2a;
  border-color: var(--color-border-light);
}

.dark-mode .field-item:hover {
  background: var(--color-hover);
}

.dark-mode .drop-placeholder {
  background: rgba(136, 149, 232, 0.15);
  border-color: #8895e8;
  color: #8895e8;
}

/* Modal styles */
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
  padding: var(--spacing-xl);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--color-text);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.modal-header h2 {
  margin: 0;
  color: var(--color-text);
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.actions .btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.actions .btn svg {
  flex-shrink: 0;
}

.button-label {
  margin-left: 5px;
}

@media (max-width: 768px) {
  .type-header {
    gap: 0.75rem;
  }

  .type-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .field-item {
    padding: 0.6rem;
    gap: var(--spacing-sm);
  }

  .field-label {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .btn-icon {
    padding: 0.4rem;
  }

  .btn-icon svg {
    width: 14px;
    height: 14px;
  }

  .field-item {
    padding: var(--spacing-sm);
  }

  .drag-handle svg {
    width: 14px;
    height: 14px;
  }
}
</style>
