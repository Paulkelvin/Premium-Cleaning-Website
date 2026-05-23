import {defineField, defineType} from 'sanity'

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonials',
  type: 'document',
  fields: [
    defineField({name: 'customerName', title: 'Customer Name', type: 'string'}),
    defineField({name: 'serviceType', title: 'Service Type', type: 'string'}),
    defineField({name: 'quote', title: 'Quote', type: 'text'}),
    defineField({name: 'rating', title: 'Rating', type: 'number'}),
    defineField({name: 'displayOrder', title: 'Display Order', type: 'number'})
  ]
})

