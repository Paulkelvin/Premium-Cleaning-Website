import {defineField, defineType} from 'sanity'

export const serviceArea = defineType({
  name: 'serviceArea',
  title: 'Service Areas',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string'}),
    defineField({name: 'region', title: 'Region', type: 'string'}),
    defineField({name: 'localSeoCopy', title: 'Local SEO Copy', type: 'text'}),
    defineField({name: 'nearbyAreas', title: 'Nearby Areas', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'displayOrder', title: 'Display Order', type: 'number'})
  ]
})

