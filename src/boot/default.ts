/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineBoot } from '#q-app/wrappers'
import { QInput, QSelect } from 'quasar'
import type { QInputProps, QSelectProps } from 'quasar'

// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot((/* { app, router, ... } */) => {
  SetComponentDefaults<QInputProps>(QInput, {
    clearable: true,
    clearIcon: 'clear',
  })
  SetComponentDefaults<QSelectProps>(QSelect, {
    clearable: true,
    clearIcon: 'clear',
  })
})

/**
 * Set some default properties on a component
 */
const SetComponentDefaults = <T>(component: any, defaults: Partial<T>): void => {
  Object.keys(defaults).forEach((prop: string) => {
    component.props[prop] =
      Array.isArray(component.props[prop]) === true || typeof component.props[prop] === 'function'
        ? { type: component.props[prop], default: (defaults as Record<string, any>)[prop] }
        : { ...component.props[prop], default: (defaults as Record<string, any>)[prop] }
  })
}
