<template>
  <form class="q-pa-md q-gutter-md" autocomplete="off">
    <q-input
      v-model="tmp.text"
      :disable="app.busy"
      label="by title"
      clearable
      @blur="submit"
      :dense="$q.screen.xs"
      dark
    />
    <q-select
      v-model="tmp.tags"
      :options="meta.tagsValues"
      label="by tags"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      multiple
      @update:model-value="
        (newValue) => {
          tmp.tags = newValue
          submit()
        }
      "
    />
    <q-select
      v-model="tmp.year"
      class="col"
      :options="meta.yearValues"
      label="by year"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @updateInputValue="submit"
    />
    <div class="row">
      <q-select
        v-model="tmp.month"
        class="col"
        :options="optionsMonth"
        emit-value
        map-options
        option-label="label"
        label="by month"
        :disable="app.busy"
        behavior="menu"
        :dense="$q.screen.xs"
        dark
        @updateInputValue="submit"
      />
      <div class="col-1" />
      <q-select
        v-model="tmp.day"
        class="col"
        :options="optionsDay"
        emit-value
        map-options
        option-label="label"
        label="by day"
        :disable="app.busy"
        behavior="menu"
        :dense="$q.screen.xs"
        dark
        @updateInputValue="submit"
      />
    </div>
    <q-select
      v-model="tmp.model"
      :options="meta.modelValues"
      label="by model"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @updateInputValue="submit"
    />
    <q-select
      v-model="tmp.lens"
      :options="meta.lensValues"
      label="by lens"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @updateInputValue="submit"
    />
    <q-select
      v-model="tmp.nick"
      :options="meta.nickValues"
      label="by author"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @updateInputValue="submit"
    />
  </form>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { months } from '../helpers'
import type { NumericFind, Find } from './models'

const app = useAppStore()
const meta = useValuesStore()
const route = useRoute()
const router = useRouter()
const tmp = ref({ ...app.find } as Find)

const queryDispatch = (query: Find, invoked: string = 'submit'): void => {
  tmp.value = { ...query }
  // delete keys without values
  Object.keys(query).forEach((key) => {
    if (tmp.value[key as keyof Find] === null) {
      delete tmp.value[key as keyof Find]
    }
  })
  // adopt to match types
  Object.keys(tmp.value).forEach((key) => {
    if (['year', 'month', 'day'].includes(key)) {
      tmp.value[key as keyof NumericFind] = Number(tmp.value[key as keyof NumericFind]) as number
    } else if (key === 'tags') {
      if (typeof tmp.value[key] === 'string') {
        tmp.value[key] = [query[key as keyof Find]] as string[]
      }
    }
  })

  app.find = tmp.value
  app.fetchRecords(true, invoked) // new filter with reset
  // this dispatch route change
  if (Object.keys(tmp.value).length) {
    router.push({
      path: '/list',
      query: tmp.value as Record<string, string | number | string[]>,
      hash: route.hash,
    })
  } else {
    router.push({ path: '/' })
  }
}

watch(
  route,
  (to) => {
    queryDispatch(to.query, 'route')
  },
  { deep: true, immediate: true },
)

const submit = (): void => {
  queryDispatch(tmp.value, 'submit')
}

const optionsMonth = computed(() => {
  return months.map((month, i) => ({ label: month, value: i + 1 }))
})
const optionsDay = computed(() => {
  const N = 31,
    from = 1,
    step = 1
  return [...Array(N)]
    .map((_, i) => from + i * step)
    .map((day) => {
      return { label: '' + day, value: day }
    })
})
</script>
