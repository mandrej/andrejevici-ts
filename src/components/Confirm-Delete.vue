<template>
  <q-dialog
    v-model="app.showConfirm"
    transition-show="slide-down"
    transition-hide="slide-up"
    persistent
  >
    <q-card class="q-dialog-plugin">
      <template v-if="rec.filename">
        <q-toolbar class="bg-grey-2 text-black row justify-between" bordered>
          <q-toolbar-title>Confirm Delete</q-toolbar-title>
        </q-toolbar>
        <q-card-section
          >Would you like to delete {{ formatBytes(rec.size) }} image named "{{ rec.headline }}"?
        </q-card-section>
        <q-card-actions class="row justify-between q-pa-md q-col-gutter-md">
          <div class="col">
            <q-btn color="primary" label="OK" @click="emit('confirmOk', rec)" />
          </div>
          <div class="col text-right">
            <q-btn flat label="Close" @click="onCancel" />
          </div>
        </q-card-actions>
      </template>
      <template v-else>
        <q-toolbar class="bg-negative text-white row justify-between" bordered>
          <q-toolbar-title>Confirm Delete</q-toolbar-title>
        </q-toolbar>
        <q-card-section>No selected image to delete</q-card-section>
        <q-card-actions class="row justify-between q-pa-md q-col-gutter-md">
          <div class="col text-right">
            <q-btn color="primary" label="Close" @click="onCancel" />
          </div>
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/app'
import { formatBytes } from '../helpers'
import type { StoredItem } from './models'

const emit = defineEmits(['confirmOk'])
defineProps<{
  rec: StoredItem
}>()

const app = useAppStore()

window.onpopstate = function () {
  app.showConfirm = false
}
const onCancel = () => {
  app.showConfirm = false
}
</script>
