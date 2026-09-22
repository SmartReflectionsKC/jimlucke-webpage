import { defineType, defineField } from 'sanity';

export const fieldNote = defineType({
  name: 'fieldNote',
  title: 'Field Note',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
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
      name: 'publicationDate',
      title: 'Publication Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt / Summary',
      type: 'text',
      rows: 3,
      description: 'A 1–2 sentence overview for cards and article reader introduction.',
      validation: (Rule) => Rule.required().min(20).max(400),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Practical Tech', value: 'Practical Tech' },
          { title: 'Nonprofit Systems', value: 'Nonprofit Systems' },
          { title: 'Innovation Lab', value: 'Innovation Lab' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required().error('Category must be selected from the approved list.'),
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
      name: 'featuredImage',
      title: 'Featured / Cover Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'featuredImageAlt',
      title: 'Featured Image Alt Text',
      type: 'string',
      description: 'Required when a featured image is provided for screen-reader accessibility.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = context.document as { featuredImage?: { asset?: unknown } } | undefined;
          if (doc?.featuredImage?.asset && (!value || !value.trim())) {
            return 'Alt text is required when a featured image is selected.';
          }
          return true;
        }),
    }),
    defineField({
      name: 'readTime',
      title: 'Read Time',
      type: 'string',
      description: 'e.g. "3 min read" or "5 min read"',
    }),
    defineField({
      name: 'externalLink',
      title: 'External Link',
      type: 'url',
      validation: (Rule) =>
        Rule.uri({
          scheme: ['http', 'https'],
        }),
    }),
    defineField({
      name: 'featured',
      title: 'Featured Article',
      type: 'boolean',
      initialValue: false,
      description: 'Highlighted at the top of writings.',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title Override',
      type: 'string',
      validation: (Rule) => Rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description Override',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'body',
      title: 'Article Body',
      type: 'blockContent',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      date: 'publicationDate',
      category: 'category',
      media: 'featuredImage',
    },
    prepare({ title, date, category, media }) {
      return {
        title,
        subtitle: `${category || 'Uncategorized'} • ${date || 'No date'}`,
        media,
      };
    },
  },
});
