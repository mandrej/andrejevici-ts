<template>
  <div class="row q-gutter-md">
    <div class="col">
      <p>{{ title }} ver.{{ version }}</p>
      <p>Bucket size: {{ bucket.size }}</p>
      <q-btn color="primary" label="SignIn" @click="auth.signIn" />
      <pre>{{ data }}</pre>
    </div>
    <div class="col">
      <q-btn color="primary" label="ExifResult" @click="read(lastRecord!.url)" />
      <q-img :src="lastRecord!.thumb" />
      <pre>{{ exif }}</pre>
    </div>
    <!-- <div class="col">
      <pre>{{ meta.values.tags }}</pre>
      <pre>{{ meta.values.email }}</pre>
      <pre>{{ meta.values.year }}</pre>
      <pre>{{ meta.values.model }}</pre>
      <pre>{{ meta.values.lens }}</pre>
    </div> -->
    <!-- <div class="col">
      <q-btn color="primary" label="Fetch" @click="app.fetchRecords()" />
      <pre>{{ app.objects }}</pre>
    </div> -->
    <div class="col">
      <q-btn color="primary" label="Mismatch" @click="mismatch" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { version } from '../helpers'
import readExif from '../helpers/exif'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import { mismatch } from 'src/helpers/remedy'
// import { useValuesStore } from 'src/stores/values'
import type { ComputedRef } from 'vue'
import type { Bucket, StoredItem, ExifResult } from './models'

defineProps<{
  title: string
}>()

const app = useAppStore()
const auth = useUserStore()
// const meta = useValuesStore()
const bucket: ComputedRef<Bucket> = computed(() => app.bucket)
const lastRecord: ComputedRef<StoredItem | null> = computed(() => app.lastRecord)
const exif = ref({} as ExifResult)
const data = computed(() => auth.user)

const read = async (url: string) => {
  exif.value = (await readExif(url)) as ExifResult
}
</script>
