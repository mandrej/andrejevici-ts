<template>
  <div class="row q-gutter-md">
    <div class="col">
      <p>{{ title }} ver.{{ version }}</p>
      <p>Bucket size: {{ bucket.size }}</p>
      <!-- <p>Last: {{ lastRecord!.filename }}</p> -->
      <q-btn color="primary" label="ExifResult" @click="exif(lastRecord!.url)" />
      <q-img :src="lastRecord!.thumb" />
      <pre>{{ data }}</pre>
    </div>
    <div class="col">
      <pre>{{ meta.values.tags }}</pre>
    </div>
    <div class="col">
      <pre>{{ meta.values.email }}</pre>
      <pre>{{ meta.values.year }}</pre>
      <pre>{{ meta.values.model }}</pre>
      <pre>{{ meta.values.lens }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { version } from '../helpers'
import readExif from '../helpers/exif'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import type { ComputedRef } from 'vue'
import type { Bucket, PhotoRecord, ExifResult } from './models'

defineProps<{
  title: string
}>()

const app = useAppStore()
const meta = useValuesStore()
const bucket: ComputedRef<Bucket> = computed(() => app.bucket)
const lastRecord: ComputedRef<PhotoRecord | null> = computed(() => app.lastRecord)
const data = ref({} as ExifResult)

const exif = async (url: string) => {
  data.value = (await readExif(url)) as ExifResult
}
</script>
