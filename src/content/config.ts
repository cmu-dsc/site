import { defineCollection, z } from 'astro:content';

const board = defineCollection({
  type: 'data',
  schema: ({ image }) => z.array(z.object({
    name: z.string(),
    title: z.string(),
    image: image().optional(),
    bio: z.string(),
    github: z.string().optional(),
    linkedin: z.string().optional()
  }))
});

const alumni = defineCollection({
  type: 'data',
  schema: ({ image }) => z.array(z.object({
    name: z.string(),
    major: z.string(),
    gradYear: z.string(),
    currentTitle: z.string().optional(),
    image: image().optional(),
    boardPositions: z.array(z.object({
      title: z.string(),
      semesters: z.array(z.string())
    })),
    linkedin: z.string().optional()
  }))
});

const projects = defineCollection({
  type: 'data',
  schema: ({ image }) => z.array(z.object({
    title: z.string(),
    description: z.string(),
    thumbnail: image().optional(),
    github: z.string().url().optional(),
    website: z.string().url().optional(),
    leaders: z.array(z.object({
      name: z.string(),
      role: z.string(),
      github: z.string().optional()
    }))
  }))
});

export const collections = {
  board,
  alumni,
  projects
};
