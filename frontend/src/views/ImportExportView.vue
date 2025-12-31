<template>
  <div class="container">
    <div class="import-export-view">
      <h2>{{ t("importExport.title") }}</h2>

      <div class="import-export-grid">
        <!-- Export Section -->
        <div class="section card">
          <h3>{{ t("importExport.export.title") }}</h3>
          <div class="action-buttons">
            <div class="action-item">
              <button class="btn btn-primary" @click="exportWithConfig" :disabled="exporting">
                {{ t("importExport.export.withConfig") }}
              </button>
              <p class="action-desc">{{ t("importExport.export.withConfigDesc") }}</p>
            </div>
            <div class="action-item">
              <button class="btn btn-secondary" @click="exportDataOnly" :disabled="exporting">
                {{ t("importExport.export.dataOnly") }}
              </button>
              <p class="action-desc">{{ t("importExport.export.dataOnlyDesc") }}</p>
            </div>
          </div>
        </div>

        <!-- Import Section -->
        <div class="section card">
          <h3>{{ t("importExport.import.title") }}</h3>
          <div class="action-buttons">
            <div class="action-item">
              <input
                ref="importConfigInput"
                type="file"
                accept=".json"
                @change="handleConfigFileSelect"
                style="display: none"
              />
              <button
                class="btn btn-primary"
                @click="() => importConfigInput?.click()"
                :disabled="importing"
              >
                {{ t("importExport.import.withConfig") }}
              </button>
              <p class="action-desc">{{ t("importExport.import.withConfigDesc") }}</p>
            </div>
            <div class="action-item">
              <input
                ref="importDataInput"
                type="file"
                accept=".json"
                @change="handleDataFileSelect"
                style="display: none"
              />
              <button
                class="btn btn-secondary"
                @click="() => importDataInput?.click()"
                :disabled="importing"
              >
                {{ t("importExport.import.dataOnly") }}
              </button>
              <p class="action-desc">{{ t("importExport.import.dataOnlyDesc") }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Spinner -->
      <div v-if="importing" class="modal-overlay">
        <div class="loading-modal">
          <div class="spinner"></div>
          <p>{{ t("importExport.import.importing") }}</p>
        </div>
      </div>

      <!-- Warning Modal for Config Import -->
      <div v-if="showConfigWarning" class="modal-overlay" @click.self="showConfigWarning = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ t("common.confirm") }}</h3>
            <button class="close-btn" @click="showConfigWarning = false">×</button>
          </div>
          <div class="modal-body">
            <p class="warning-text">{{ t("importExport.import.warningConfig") }}</p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showConfigWarning = false">
              {{ t("common.cancel") }}
            </button>
            <button class="btn btn-primary" @click="confirmConfigImport">
              {{ t("common.confirm") }}
            </button>
          </div>
        </div>
      </div>

      <!-- Warning Modal for Data Import -->
      <div v-if="showDataWarning" class="modal-overlay" @click.self="showDataWarning = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ t("common.confirm") }}</h3>
            <button class="close-btn" @click="showDataWarning = false">×</button>
          </div>
          <div class="modal-body">
            <p class="warning-text">{{ t("importExport.import.warningData") }}</p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDataWarning = false">
              {{ t("common.cancel") }}
            </button>
            <button class="btn btn-primary" @click="confirmDataImport">
              {{ t("common.confirm") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import axios from "axios";

const { t } = useI18n();

const exporting = ref(false);
const importing = ref(false);
const showConfigWarning = ref(false);
const showDataWarning = ref(false);
const importConfigInput = ref<HTMLInputElement | null>(null);
const importDataInput = ref<HTMLInputElement | null>(null);
const pendingConfigFile = ref<File | null>(null);
const pendingDataFile = ref<File | null>(null);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "/api"),
  headers: {
    "Content-Type": "application/json",
  },
});

async function exportWithConfig() {
  exporting.value = true;
  try {
    const response = await apiClient.get("/config/export/full", {
      responseType: "json",
    });
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vinylbank-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    alert(t("importExport.export.success"));
  } catch (error) {
    console.error("Export error:", error);
    alert(t("importExport.export.error"));
  } finally {
    exporting.value = false;
  }
}

async function exportDataOnly() {
  exporting.value = true;
  try {
    const response = await apiClient.get("/config/export/data", {
      responseType: "json",
    });
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vinylbank-data-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    alert(t("importExport.export.success"));
  } catch (error) {
    console.error("Export error:", error);
    alert(t("importExport.export.error"));
  } finally {
    exporting.value = false;
  }
}

function handleConfigFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    pendingConfigFile.value = file;
    showConfigWarning.value = true;
  }
}

function handleDataFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    pendingDataFile.value = file;
    showDataWarning.value = true;
  }
}

async function confirmConfigImport() {
  if (!pendingConfigFile.value) {
    alert(t("importExport.import.fileRequired"));
    return;
  }

  importing.value = true;
  showConfigWarning.value = false;

  try {
    const text = await pendingConfigFile.value.text();
    const data = JSON.parse(text);

    await apiClient.post("/config/import/full", data);

    alert(t("importExport.import.success"));
    pendingConfigFile.value = null;
    if (importConfigInput.value) {
      importConfigInput.value.value = "";
    }
    // Reload the page to reflect changes
    window.location.reload();
  } catch (error) {
    console.error("Import error:", error);
    alert(t("importExport.import.error"));
  } finally {
    importing.value = false;
  }
}

async function confirmDataImport() {
  if (!pendingDataFile.value) {
    alert(t("importExport.import.fileRequired"));
    return;
  }

  importing.value = true;
  showDataWarning.value = false;

  try {
    const text = await pendingDataFile.value.text();
    const data = JSON.parse(text);

    const response = await apiClient.post("/config/import/data", data);
    const warnings = response.data.warnings;

    let message = t("importExport.import.success");
    if (warnings) {
      const warningParts: string[] = [];
      if (warnings.skippedItems?.length > 0) {
        warningParts.push(
          `Skipped items (type not found): ${warnings.skippedItems.slice(0, 5).join(", ")}${
            warnings.skippedItems.length > 5 ? "..." : ""
          }`
        );
      }
      if (warnings.skippedFields?.length > 0) {
        warningParts.push(
          `Skipped fields: ${warnings.skippedFields.slice(0, 5).join(", ")}${
            warnings.skippedFields.length > 5 ? "..." : ""
          }`
        );
      }
      if (warningParts.length > 0) {
        message += "\n\n" + warningParts.join("\n");
      }
    }

    alert(message);
    pendingDataFile.value = null;
    if (importDataInput.value) {
      importDataInput.value.value = "";
    }
    // Reload the page to reflect changes
    window.location.reload();
  } catch (error) {
    console.error("Import error:", error);
    alert(t("importExport.import.error"));
  } finally {
    importing.value = false;
  }
}
</script>

<style scoped>
.import-export-view h2 {
  margin-bottom: var(--spacing-xl);
  color: var(--color-text);
}

.import-export-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
}

@media (max-width: 768px) {
  .import-export-grid {
    grid-template-columns: 1fr;
  }
}

.section {
  padding: var(--spacing-xl);
}

.section h3 {
  margin-bottom: var(--spacing-lg);
  color: var(--color-text);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.action-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.action-desc {
  font-size: 0.9rem;
  color: var(--color-text-subtle);
  margin: 0;
}

.warning-text {
  color: var(--color-danger);
  font-weight: 500;
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-text);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.dark-mode .modal {
  background: var(--color-surface-dark);
  border-color: var(--color-border-dark);
}

.dark-mode .modal-header {
  border-color: var(--color-border-dark);
}

.dark-mode .modal-actions {
  border-color: var(--color-border-dark);
}

.loading-modal {
  background: var(--color-surface);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
}

.loading-modal p {
  margin: 0;
  font-size: 1.125rem;
  color: var(--color-text);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
