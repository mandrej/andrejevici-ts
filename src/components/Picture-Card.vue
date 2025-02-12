<template>
  <q-card v-if="rec.thumb" v-bind="cardAttributes(rec.filename)" class="bg-grey-3" flat>
    <q-card-section horizontal>
      <q-img
        class="cursor-pointer col"
        style="height: 240px"
        loading="lazy"
        :src="rec.thumb"
        v-ripple.early="{ color: 'purple' }"
        no-spinner
        @click="emit('carouselShow', rec.filename)"
      >
        <template #error>
          <img :src="fileBroken" class="center" />
        </template>
        <div class="absolute-bottom text-subtitle2 ellipsis">
          {{ rec.headline }}
        </div>
      </q-img>
      <q-card-actions
        v-if="canManage"
        class="justify-around bg-grey-10 col"
        style="max-width: 58px"
        vertical
      >
        <q-btn flat round icon="delete" @click="emit('confirmDelete', rec)" />
        <q-btn flat round icon="edit" @click="emit('editRecord', rec)" />
        <q-btn
          v-if="canMergeTags"
          flat
          round
          icon="content_paste"
          @click="emit('mergeTags', rec)"
        />
        <q-btn flat round icon="share" @click="onShare" />
      </q-card-actions>
    </q-card-section>
    <q-card-section class="row justify-between">
      <span>
        <router-link :to="{ path: '/list', query: { nick: rec.nick } }" class="text-black undreline"
          >{{ rec.nick }}
        </router-link>
        ,
        <router-link
          :to="{
            path: '/list',
            query: {
              year: rec.year,
              month: rec.month,
              day: rec.day,
            },
          }"
          class="text-black undreline"
          >{{ formatDatum(rec.date!, 'DD.MM.YYYY') }}</router-link
        >
        {{ rec.date!.substring(11) }}
      </span>
      <q-icon
        v-if="rec.loc"
        name="my_location"
        size="24px"
        target="blank"
        color="grey-7"
        @click.stop.prevent="openMaps(rec.loc)"
      />
    </q-card-section>
  </q-card>

  <q-card v-else v-bind="cardAttributes(rec.filename)" class="bg-grey-3" flat>
    <q-img
      class="cursor-pointer"
      loading="lazy"
      :ratio="5 / 4"
      :src="rec.url"
      v-ripple.early="{ color: 'purple' }"
      no-spinner
      @click="emit('carouselShow', rec.filename)"
    >
      <template #error>
        <img :src="fileBroken" />
      </template>
      <q-badge floating class="text-black" color="warning">
        {{ formatBytes(rec.size) }}
      </q-badge>
    </q-img>
    <q-card-actions v-if="canManage" class="justify-between">
      <q-btn flat round icon="delete" @click="emit('deleteRecord', rec)" />
      <q-btn flat round icon="publish" @click="emit('editRecord', rec)" />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { copyToClipboard } from 'quasar'
import { fileBroken, formatDatum, formatBytes, U, reFilename } from '../helpers'
import notify from '../helpers/notify'
import type { StoredItem } from './models'

const props = defineProps<{
  rec: StoredItem
  canManage: boolean
  canMergeTags?: boolean
}>()
const emit = defineEmits([
  'carouselShow',
  'confirmDelete',
  'editRecord',
  'mergeTags',
  'deleteRecord',
])

/**
 * Given a filename, return an object with `id` and `class` attributes.
 * `id` is a unique id for the element, and `class` is the extension of the
 * file (e.g. 'jpg', 'png', etc.).
 *
 * @param {string} filename - the filename to process
 * @returns {{ id: string, class: string }} - an object with `id` and `class`
 *   attributes
 */
const cardAttributes = (filename: string): { id: string; class: string } => {
  let attr: { id: string; class: string } = {
    id: U + 'x',
    class: 'jpg',
  }
  try {
    const [, name, ext] = filename.match(reFilename) as [string, string, string]
    attr = {
      id: U + name,
      class: ext.substring(1),
    }
  } catch {
    // do nothing, just use the default
  }
  return attr
}
const onShare = () => {
  const url = window.location.href + '#' + U + props.rec.filename
  copyToClipboard(url)
    .then(() => {
      notify({ message: 'URL copied to clipboard' })
    })
    .catch(() => {
      notify({ type: 'warning', message: 'Unable to copy URL to clipboard' })
    })
}

/**
 * Opens a new tab with Google Maps search for the specified location.
 *
 * @param {string} loc - The location coordinates in "latitude,longitude" format.
 * @returns {void}
 */
const openMaps = (loc: string): void => {
  const url = `https://www.google.com/maps/search/?api=1&query=${loc}`
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.q-btn,
.q-icon {
  color: $grey-7;
}
.q-btn.disabled {
  opacity: 0.2 !important;
}
.center {
  width: 25%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
