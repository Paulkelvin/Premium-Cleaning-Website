import {defineField, defineType} from 'sanity'

export const galleryItem = defineType({
  name: 'galleryItem',
  title: 'Gallery Items',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'serviceType', title: 'Service Type', type: 'string'}),
    defineField({name: 'beforeImageUrl', title: 'Before Image URL', type: 'url'}),
    defineField({name: 'afterImageUrl', title: 'After Image URL', type: 'url'}),
    defineField({name: 'description', title: 'Description', type: 'text'}),
    defineField({name: 'displayOrder', title: 'Display Order', type: 'number'})
  ]
})

