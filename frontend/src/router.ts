import { createRouter, createWebHistory } from "vue-router";
import CollectionView from "./views/CollectionView.vue";
import ConfigView from "./views/ConfigView.vue";
import ImportExportView from "./views/ImportExportView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/collection",
    },
    {
      path: "/collection",
      name: "collection",
      component: CollectionView,
    },
    {
      path: "/config",
      name: "config",
      component: ConfigView,
    },
    {
      path: "/import-export",
      name: "import-export",
      component: ImportExportView,
    },
  ],
});

export default router;
