import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({name: 'businessName', title: 'Business Name', type: 'string'}),
    defineField({name: 'logoText', title: 'Logo Text', type: 'string'}),
    defineField({name: 'phone', title: 'Phone', type: 'string'}),
    defineField({name: 'email', title: 'Email', type: 'string'}),
    defineField({name: 'serviceAreaSummary', title: 'Service Area Summary', type: 'string'}),
    defineField({name: 'operatingHours', title: 'Operating Hours', type: 'string'}),
    defineField({name: 'footerDescription', title: 'Footer Description', type: 'text'}),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      of: [{type: 'object', fields: [
        defineField({name: 'label', title: 'Label', type: 'string'}),
        defineField({name: 'url', title: 'URL', type: 'url'})
      ]}]
    }),
    defineField({name: 'primaryCtaLabel', title: 'Primary CTA Label', type: 'string'}),
    defineField({name: 'primaryCtaHref', title: 'Primary CTA URL', type: 'string'})
  ]
})

