<template>
  <q-btn flat round :size="size" icon="history" @click="previousCollection" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import type { LocationQueryRaw } from 'vue-router'

const app = useAppStore()
const router = useRouter()

defineProps<{
  size?: string
}>()

/**
 * Navigate to the previous collection and refresh records.
 * @returns {void}
 */
const previousCollection = (): void => {
  app.fetchRecords(true, 'refresh')
  router.push({ path: '/list', query: app.find as LocationQueryRaw })
}
</script>
