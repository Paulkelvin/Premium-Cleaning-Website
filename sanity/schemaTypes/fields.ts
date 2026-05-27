import {defineField} from 'sanity'

/** Uploadable image with focal-point crop — client-friendly replace in Studio. */
export function imageField(name: string, title: string, description?: string) {
  return defineField({
    name,
    title,
    type: 'image',
    description,
    options: {hotspot: true},
  })
}
