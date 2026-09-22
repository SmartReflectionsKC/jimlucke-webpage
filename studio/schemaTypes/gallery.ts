import { defineType, defineField } from 'sanity';

export const gallery = defineType({
  name: 'gallery',
  title: 'Photography Gallery',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Overview description of the collection.',
      validation: (Rule) => Rule.required().max(500),
    }),
    defineField({
      name: 'publicationDate',
      title: 'Publication Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverImageAlt',
      title: 'Cover Image Alt Text',
      type: 'string',
      validation: (Rule) => Rule.required().min(5).error('Cover image alt text is required for accessibility.'),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      initialValue: 'Visual Storytelling',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Determines ordering in the gallery grid (e.g. 1, 2, 3...).',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'photos',
      title: 'Photographs in Collection',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'photo' }],
        },
      ],
      description: 'Ordered list of photographs included in this gallery.',
      validation: (Rule) => Rule.required().min(1).error('A gallery must contain at least one photograph.'),
    }),
    defineField({
      name: 'featured',
      title: 'Featured Gallery',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      order: 'displayOrder',
      media: 'coverImage',
    },
    prepare({ title, order, media }) {
      return {
        title: title || 'Untitled Gallery',
        subtitle: `Order: ${order || 'None'}`,
        media,
      };
    },
  },
});
