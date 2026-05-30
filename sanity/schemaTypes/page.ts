import {defineField, defineType} from 'sanity'
import {imageField} from './fields'

export const page = defineType({
  name: 'page',
  title: 'Pages',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'title'}}),
    defineField({name: 'metaDescription', title: 'Meta Description', type: 'text'}),
    defineField({name: 'heroEyebrow', title: 'Hero Eyebrow', type: 'string'}),
    defineField({name: 'heroTitle', title: 'Hero Title', type: 'text'}),
    defineField({name: 'heroCopy', title: 'Hero Copy', type: 'text'}),
    imageField('heroImage', 'Hero image'),
    defineField({
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
          defineField({name: 'title', title: 'Title', type: 'string'}),
          defineField({name: 'body', title: 'Body', type: 'text'}),
          imageField('image', 'Section image'),
        ],
      }],
    }),
    defineField({
      name: 'teamMembers',
      title: 'Team Members',
      description: 'Used on the About page team section.',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'name', title: 'Name', type: 'string'}),
          defineField({name: 'role', title: 'Role', type: 'string'}),
          defineField({name: 'bio', title: 'Bio', type: 'text'}),
          imageField('photo', 'Photo', 'Upload a headshot. Leave empty to show a placeholder until you add one.'),
        ],
      }],
    }),
  ],
})
