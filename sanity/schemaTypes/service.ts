import {defineField, defineType} from 'sanity'

export const service = defineType({
  name: 'service',
  title: 'Services',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'title'}}),
    defineField({name: 'shortDescription', title: 'Short Description', type: 'text'}),
    defineField({name: 'heroImageUrl', title: 'Hero Image URL', type: 'url'}),
    defineField({name: 'overviewTitle', title: 'Overview Title', type: 'string'}),
    defineField({name: 'overview', title: 'Overview', type: 'text'}),
    defineField({name: 'includedItems', title: 'Included Items', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'recommendedAddOns', title: 'Recommended Add-ons', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'estimateFactors', title: 'Estimate Factors', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'ctaLabel', title: 'CTA Label', type: 'string'}),
    defineField({name: 'displayOrder', title: 'Display Order', type: 'number'})
  ]
})

