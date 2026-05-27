import {defineField, defineType} from 'sanity'
import {imageField} from './fields'

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonials',
  type: 'document',
  fields: [
    defineField({name: 'customerName', title: 'Customer Name', type: 'string'}),
    defineField({name: 'serviceType', title: 'Service Type', type: 'string'}),
    defineField({name: 'location', title: 'Location', type: 'string'}),
    defineField({name: 'quote', title: 'Quote', type: 'text'}),
    imageField('avatar', 'Customer photo', 'Shown on homepage reviews and testimonials page.'),
    defineField({name: 'rating', title: 'Rating', type: 'number', validation: (Rule) => Rule.min(1).max(5)}),
    defineField({name: 'displayOrder', title: 'Display Order', type: 'number'}),
  ],
  preview: {
    select: {title: 'customerName', subtitle: 'serviceType', media: 'avatar'},
  },
})
