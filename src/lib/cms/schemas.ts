import { defineType, defineField } from 'sanity';

/** Legacy name list (kept for back-compat; nothing should depend on it). */
export const sanitySchemas = [
  'project',
  'caseStudy',
  'blogPost',
  'generatedOutput',
  'note',
  'timelineEvent',
  'mediaAsset',
];

const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'summary', type: 'text', rows: 3 }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } }),
    defineField({ name: 'coverImage', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'url', type: 'url' }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
  ],
});

const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'client', type: 'string' }),
    defineField({ name: 'summary', type: 'text', rows: 3 }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'outcome', type: 'text', rows: 2 }),
    defineField({ name: 'tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
  ],
});

const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'excerpt', type: 'text', rows: 3 }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
  ],
});

const generatedOutput = defineType({
  name: 'generatedOutput',
  title: 'Generated Output',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'platform', type: 'string' }),
    defineField({ name: 'content', type: 'text', rows: 8 }),
    defineField({
      name: 'status',
      type: 'string',
      options: { list: ['draft', 'approved', 'published'] },
      initialValue: 'draft',
    }),
    defineField({ name: 'sourceDecisionId', type: 'string' }),
    defineField({ name: 'confidence', type: 'number' }),
    defineField({ name: 'createdAt', type: 'datetime' }),
  ],
});

const note = defineType({
  name: 'note',
  title: 'Note',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'body', type: 'text' }),
    defineField({ name: 'tags', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } }),
    defineField({ name: 'createdAt', type: 'datetime' }),
  ],
});

const timelineEvent = defineType({
  name: 'timelineEvent',
  title: 'Timeline Event',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'date', type: 'datetime' }),
    defineField({ name: 'description', type: 'text', rows: 2 }),
    defineField({ name: 'category', type: 'string' }),
  ],
});

const mediaAsset = defineType({
  name: 'mediaAsset',
  title: 'Media Asset',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'alt', type: 'string' }),
    defineField({ name: 'kind', type: 'string' }),
  ],
});

export const schemaTypes = [
  project,
  caseStudy,
  blogPost,
  generatedOutput,
  note,
  timelineEvent,
  mediaAsset,
];
