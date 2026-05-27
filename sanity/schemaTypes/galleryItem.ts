import {defineField, defineType} from 'sanity'
import {imageField} from './fields'

export const galleryItem = defineType({
  name: 'galleryItem',
  title: 'Gallery Items',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'title'}}),
    defineField({name: 'serviceType', title: 'Service Type', type: 'string'}),
    defineField({name: 'category', title: 'Category', type: 'string'}),
    defineField({name: 'badge', title: 'Badge Label', type: 'string'}),
    imageField('beforeImage', 'Before photo', 'Upload the “before cleaning” photo.'),
    imageField('afterImage', 'After photo', 'Upload the “after cleaning” photo.'),
    defineField({name: 'description', title: 'Description', type: 'text'}),
    defineField({name: 'displayOrder', title: 'Display Order', type: 'number'}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'serviceType', media: 'afterImage'},
  },
})
