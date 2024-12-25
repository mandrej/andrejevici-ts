<template>
  <div>
    <p>{{ title }} ver.{{ version }}</p>
    <p>Bucket size: {{ bucket.size }}</p>
    <!-- <p>Last: {{ lastRecord!.filename }}</p> -->
    <q-btn color="primary" label="Exif" @click="exif(lastRecord!.url)" />
    <q-img :src="lastRecord!.thumb" />
    <pre>{{ data }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { version } from '../helpers'
import readExif from '../helpers/exif'
import { useAppStore } from 'src/stores/app'
import type { ComputedRef } from 'vue'
import type { Bucket, Record } from './models'

defineProps<{
  title: string
}>()

const app = useAppStore()
const bucket: ComputedRef<Bucket> = computed(() => app.bucket)
const lastRecord: ComputedRef<Record | null> = computed(() => app.lastRecord)
const data = ref({})

const exif = async (url: string) => {
  data.value = await readExif(url)
}
</script>
