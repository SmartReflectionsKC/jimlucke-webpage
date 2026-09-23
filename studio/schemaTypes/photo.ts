import { defineType, defineField } from 'sanity';

export const photo = defineType({
  name: 'photo',
  title: 'Photograph',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'image',
      title: 'Image File',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative Text',
      type: 'string',
      description: 'Required accessible description for screen readers and SEO.',
      validation: (Rule) => Rule.required().min(5).error('Alt text is required for accessibility.'),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'text',
      rows: 2,
      description: 'Editorial caption displayed below the photo in full viewer.',
      validation: (Rule) => Rule.max(300),
    }),
    defineField({
      name: 'datePhotographed',
      title: 'Date Photographed',
      type: 'date',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'e.g. "Overland Park, Kansas" or "Route 66"',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'cameraDetails',
      title: 'Camera & Technical Details',
      type: 'object',
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        defineField({ name: 'camera', title: 'Camera Body', type: 'string' }),
        defineField({ name: 'lens', title: 'Lens', type: 'string' }),
        defineField({ name: 'focalLength', title: 'Focal Length', type: 'string' }),
        defineField({ name: 'aperture', title: 'Aperture', type: 'string' }),
        defineField({ name: 'shutterSpeed', title: 'Shutter Speed', type: 'string' }),
        defineField({ name: 'iso', title: 'ISO', type: 'number' }),
      ],
    }),
    defineField({
      name: 'featured',
      title: 'Featured Photograph',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'legacyFilename',
      title: 'Legacy Filename',
      type: 'string',
      readOnly: true,
      hidden: true,
      description: 'Identifier used during content migration.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      alt: 'alt',
      media: 'image',
    },
    prepare({ title, alt, media }) {
      return {
        title: title || 'Untitled Photo',
        subtitle: alt || 'No alt text',
        media,
      };
    },
  },
});
