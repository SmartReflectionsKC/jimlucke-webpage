import { defineType, defineArrayMember } from 'sanity';

/**
 * Portable Text schema definition used for rich text in Field Notes.
 */
export const blockContent = defineType({
  title: 'Block Content',
  name: 'blockContent',
  type: 'array',
  of: [
    defineArrayMember({
      title: 'Block',
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bullet', value: 'bullet' },
        { title: 'Numbered', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Strong', value: 'strong' },
          { title: 'Emphasis', value: 'em' },
          { title: 'Code', value: 'code' },
          { title: 'Underline', value: 'underline' },
        ],
        annotations: [
          {
            title: 'Link',
            name: 'link',
            type: 'object',
            fields: [
              {
                title: 'URL',
                name: 'href',
                type: 'url',
                validation: (Rule) =>
                  Rule.required().uri({
                    scheme: ['http', 'https', 'mailto'],
                    allowRelative: true,
                  }),
              },
              {
                title: 'Open in new tab',
                name: 'openInNewTab',
                type: 'boolean',
                initialValue: false,
                description:
                  'Internal JimLucke.com links open in the same tab. External links should open in a new tab with rel="noopener noreferrer".',
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          description: 'Important for SEO and accessibility. Alt text is required.',
          validation: (Rule) => Rule.required().min(5).error('Alt text is required for accessibility.'),
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
          description: 'Editorial caption displayed below the image.',
        },
      ],
    }),
    defineArrayMember({
      name: 'codeBlock',
      title: 'Code Block',
      type: 'object',
      fields: [
        {
          name: 'language',
          title: 'Language',
          type: 'string',
          options: {
            list: [
              { title: 'TypeScript / JavaScript', value: 'typescript' },
              { title: 'HTML / CSS', value: 'html' },
              { title: 'JSON', value: 'json' },
              { title: 'Bash / Shell', value: 'bash' },
              { title: 'Python', value: 'python' },
              { title: 'Plain Text', value: 'text' },
            ],
          },
          initialValue: 'text',
        },
        {
          name: 'code',
          title: 'Code',
          type: 'text',
          rows: 6,
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
  ],
});
