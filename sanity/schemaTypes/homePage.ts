import {defineField, defineType} from 'sanity'

const ctaFields = [
  defineField({name: 'label', title: 'Label', type: 'string'}),
  defineField({name: 'href', title: 'URL', type: 'string'})
]

const cardFields = [
  defineField({name: 'title', title: 'Title', type: 'string'}),
  defineField({name: 'body', title: 'Body', type: 'text'}),
  defineField({name: 'imageUrl', title: 'Image URL', type: 'url'}),
  defineField({name: 'href', title: 'URL', type: 'string'})
]

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({name: 'heroEyebrow', title: 'Hero Eyebrow', type: 'string'}),
    defineField({name: 'heroTitle', title: 'Hero Title', type: 'text'}),
    defineField({name: 'heroCopy', title: 'Hero Copy', type: 'text'}),
    defineField({name: 'heroImageUrl', title: 'Hero Image URL', type: 'url'}),
    defineField({name: 'primaryCta', title: 'Primary CTA', type: 'object', fields: ctaFields}),
    defineField({name: 'secondaryCta', title: 'Secondary CTA', type: 'object', fields: ctaFields}),
    defineField({name: 'trustIndicators', title: 'Trust Indicators', type: 'array', of: [{type: 'object', fields: [
      defineField({name: 'value', title: 'Value', type: 'string'}),
      defineField({name: 'label', title: 'Label', type: 'string'})
    ]}]}),
    defineField({name: 'servicesOverviewTitle', title: 'Services Overview Title', type: 'text'}),
    defineField({name: 'serviceCards', title: 'Service Cards', type: 'array', of: [{type: 'object', fields: cardFields}]}),
    defineField({name: 'howItWorksSteps', title: 'How It Works Steps', type: 'array', of: [{type: 'object', fields: cardFields}]}),
    defineField({name: 'whyChooseUsTitle', title: 'Why Choose Us Title', type: 'text'}),
    defineField({name: 'whyChooseUsItems', title: 'Why Choose Us Items', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'finalCtaTitle', title: 'Final CTA Title', type: 'text'}),
    defineField({name: 'finalCtaCopy', title: 'Final CTA Copy', type: 'text'})
  ]
})

