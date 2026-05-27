import {defineField, defineType} from 'sanity'
import {imageField} from './fields'

export const service = defineType({
  name: 'service',
  title: 'Services',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'title'}}),
    defineField({name: 'shortDescription', title: 'Short Description', type: 'text'}),
    imageField('heroImage', 'Hero image', 'Main photo on the service detail page.'),
    defineField({name: 'overviewTitle', title: 'Overview Title', type: 'string'}),
    defineField({name: 'overview', title: 'Overview', type: 'text'}),
    defineField({name: 'includedItems', title: 'Included Items', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'recommendedAddOns', title: 'Recommended Add-ons', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'estimateFactors', title: 'Estimate Factors', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'ctaLabel', title: 'CTA Label', type: 'string'}),
    defineField({name: 'displayOrder', title: 'Display Order', type: 'number'}),
  ],
  preview: {
    select: {title: 'title', media: 'heroImage'},
  },
})
