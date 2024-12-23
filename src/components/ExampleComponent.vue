<template>
  <div>
    <p>{{ title }} ver.{{ version }}</p>
    <p>Bucket size: {{ app.bucket.size }}</p>
    <p>Last: {{ lastRecord?.filename }}</p>
    <q-btn color="primary" label="Refresh" @click="app.getLast()" />
    <q-img :src="thumbUrl(lastRecord!.filename)" />
  </div>
</template>

<script setup lang="ts">
import type { ComputedRef } from 'vue'
import { onMounted, computed } from 'vue'
import { version, thumbUrl } from '../helpers'
import { useAppStore } from 'src/stores/app'
import type { Record } from './models'

defineProps<{
  title: string
}>()

onMounted(() => {
  // app.getLast()
  app.bucketRead()
})

const app = useAppStore()
const lastRecord: ComputedRef<Record | null> = computed(() => app.lastRecord)
</script>
