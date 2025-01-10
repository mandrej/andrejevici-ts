<template>
  <q-dialog
    v-model="app.showEdit"
    :maximized="$q.screen.lt.md"
    transition-show="slide-up"
    transition-hide="slide-down"
    persistent
  >
    <q-card class="q-dialog-plugin full-width" style="max-width: 800px">
      <q-toolbar class="bg-white text-black row justify-between">
        <div>
          <q-btn color="primary" type="submit" label="Save" @click="onSubmit" />
          <q-btn
            v-if="auth.user!.isAdmin"
            class="q-ml-sm gt-sm"
            flat
            label="Read Exif"
            @click="getExif"
          />
        </div>
        <div>{{ formatBytes(tmp.size) }} {{ tmp.dim }}</div>
        <div>
          <q-btn flat round dense icon="close" @click="onCancel" />
        </div>
      </q-toolbar>
      <q-card-section>
        <q-form
          autofocus
          autocorrect="off"
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          @submit="onSubmit"
        >
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-sm-4 gt-xs">
              <q-img :ratio="1" :src="tmp.thumb ? tmp.thumb : tmp.url">
                <template #error>
                  <img :src="fileBroken" />
                </template>
              </q-img>
            </div>
            <div class="col-xs-12 col-sm-8 col-8">
              <q-input
                v-model="tmp.headline"
                label="Headline"
                :placeholder="CONFIG.noTitle"
                :hint="`Image without name is called '${CONFIG.noTitle}'`"
                @blur="
                  tmp.headline === undefined
                    ? (tmp.headline = CONFIG.noTitle)
                    : (tmp.headline = tmp.headline.trim())
                "
                autofocus
                clearable
                @clear="
                  (val) => {
                    tmp.headline = CONFIG.noTitle
                  }
                "
              />
              <q-input v-model="tmp.filename" label="Filename" readonly />
              <q-select
                v-model="tmp.email"
                :options="meta.emailValues"
                new-value-mode="add-unique"
                hide-dropdown-icon
                label="Author"
                hint="Existing member can add freind's photo and email"
                :rules="[
                  (val: string) => !!val || 'Email is missing',
                  (val: string) => isValidEmail(val),
                ]"
                @new-value="addNewEmail"
              />
              <q-input v-model="tmp.date" label="Date taken">
                <template #prepend>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="tmp.date" :mask="CONFIG.dateFormat">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
                <template #append>
                  <q-icon name="access_time" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-time v-model="tmp.date" :mask="CONFIG.dateFormat" format24h>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="fit row nowrap">
              <div class="col-xs-11">
                <q-select
                  class="col-auto"
                  v-model="tmp.tags"
                  :options="meta.tagsValues"
                  label="Tags"
                  new-value-mode="add-unique"
                  hide-dropdown-icon
                  multiple
                  clearable
                  :hint="
                    meta.tagsToApply && meta.tagsToApply.length
                      ? 'merge with ' + meta.tagsToApply
                      : ''
                  "
                  @new-value="addNewTag"
                />
              </div>
              <div class="col self-center text-right">
                <q-icon
                  class="q-pl-sm q-pb-md cursor-pointer"
                  name="content_copy"
                  size="24px"
                  color="grey"
                  @click.stop.prevent="copyTags(tmp.tags || [])"
                />
                <q-icon
                  class="q-pl-sm q-pb-md cursor-pointer"
                  name="content_paste"
                  size="24px"
                  color="grey"
                  @click.stop.prevent="mergeTags(tmp.tags || [])"
                />
              </div>
            </div>
            <div class="col-xs-10"></div>

            <div class="col-xs-2 vertical-bottom text-right"></div>

            <div class="col-xs-12 col-sm-6">
              <q-select
                v-model="tmp.model"
                :options="meta.modelValues"
                new-value-mode="add-unique"
                hide-dropdown-icon
                label="Camera Model"
                @new-value="addNewModel"
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <q-select
                v-model="tmp.lens"
                :options="meta.lensValues"
                new-value-mode="add-unique"
                hide-dropdown-icon
                label="Camera Lens"
                @new-value="addNewLens"
              />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.focal_length" type="number" label="Focal length [mm]" />
            </div>

            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.iso" type="number" label="ISO [ASA]" />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.aperture" type="number" step="0.1" label="Aperture" />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.shutter" label="Shutter [s]" />
            </div>

            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.loc" label="Location [latitude, longitude]" clearable />
            </div>
            <div class="col-xs-6 col-sm-4 col-4 q-mt-sm">
              <q-checkbox v-model="tmp.flash" label="Flash fired?" />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { CONFIG, fileBroken, formatBytes, U, emailNick, textSlug, sliceSlug } from '../helpers'
import readExif from '../helpers/exif'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import type { StoredItem, ExifResult } from './models'

const emit = defineEmits(['editOk'])
const props = defineProps<{
  rec: StoredItem
}>()

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
let tmp: StoredItem = reactive({ ...props.rec })

const getExif = async (): Promise<void> => {
  /**
   * Reread exif data from the image URL and update the temporary record.
   * @returns {Promise<void>}
   */
  const exif = (await readExif(tmp.url)) as ExifResult
  const tags: string[] = tmp.tags || []

  tmp = { ...tmp, ...exif }
  // Object.keys(exif).forEach((k) => {
  //   tmp[k] = exif[k as keyof ExifResult]
  // })
  // add flash tag if exif flash true
  if (tmp.flash && tags.indexOf('flash') === -1) {
    tags.push('flash')
  }
  tmp.tags = tags
  tmp.email = auth.user!.email as string
}
const isValidEmail = (val: string) => {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/
  return emailPattern.test(val) || 'Invalid email'
}

/**
 * Add a new email to the meta fields.
 * @param {string} inputValue - The email value to be added.
 * @param {(result: string) => void} done - Callback function to be called with the input value.
 * @returns {void}
 */
const addNewEmail = (inputValue: string, done: (result: string) => void): void => {
  meta.addNewField(inputValue, 'email')
  done(inputValue)
}
/**
 * Add a new tag to the meta fields.
 * @param {string} inputValue - The tag value to be added.
 * @param {(result: string) => void} done - Callback function to be called with the input value.
 * @returns {void}
 */
const addNewTag = (inputValue: string, done: (result: string) => void): void => {
  meta.addNewField(inputValue, 'tags')
  done(inputValue)
}
/**
 * Add a new model to the meta fields.
 * @param {string} inputValue - The model value to be added.
 * @param {(result: string) => void} done - Callback function to be called with the input value.
 * @returns {void}
 */
const addNewModel = (inputValue: string, done: (result: string) => void): void => {
  meta.addNewField(inputValue, 'model')
  done(inputValue)
}
/**
 * Add a new lens to the meta fields.
 * @param {string} inputValue - The lens value to be added.
 * @param {(result: string) => void} done - Callback function to be called with the input value.
 * @returns {void}
 */
const addNewLens = (inputValue: string, done: (result: string) => void): void => {
  meta.addNewField(inputValue, 'lens')
  done(inputValue)
}
/**
 * Copies the tags from the source to the meta tagsToApply array.
 * @param {string[]} source - The source array of tags to copy.
 * @returns {void}
 */
const copyTags = (source: string[]): void => {
  meta.tagsToApply = source
}
/**
 * Merge the tags from the source array into the meta tagsToApply array.
 * @param {string[]} source - The source array of tags to merge.
 * @returns {void}
 */
const mergeTags = (source: string[]): void => {
  if (Array.isArray(source)) {
    tmp.tags = Array.from(new Set([...meta.tagsToApply, ...source])).sort()
  } else {
    tmp.tags = meta.tagsToApply
  }
}

window.onpopstate = function () {
  app.showEdit = false
}
const onCancel = () => {
  app.showEdit = false
}
/**
 * Handles the submission of the edited record.
 * @returns {void}
 */
const onSubmit = (): void => {
  const datum: Date = new Date(Date.parse(tmp.date!))
  tmp.year = datum.getFullYear()
  tmp.month = datum.getMonth() + 1
  tmp.day = datum.getDate()
  tmp.tags = tmp.tags ? tmp.tags : []
  tmp.nick = emailNick(tmp.email)
  tmp.headline = tmp.headline.trim() === '' ? CONFIG.noTitle : tmp.headline.trim()
  const slug: string = textSlug(tmp.headline)
  tmp.text = sliceSlug(slug)
  // set find on new added image
  if (!tmp.thumb) {
    app.find = { year: tmp.year, month: tmp.month, day: tmp.day }
  }
  app.saveRecord(tmp)
  emit('editOk', `${U}${tmp.filename}`)
  app.showEdit = false
}
</script>
