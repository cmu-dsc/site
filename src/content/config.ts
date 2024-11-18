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

const sponsors = defineCollection({
  type: 'data',
  schema: ({ image }) => z.object({
    gold: z.array(z.object({
      name: z.string(),
      logo: image(),
      url: z.string().url()
    })),
    silver: z.array(z.object({
      name: z.string(),
      logo: image(),
      url: z.string().url()
    })),
    bronze: z.array(z.object({
      name: z.string(),
      logo: image(),
      url: z.string().url()
    }))
  })
});

const events = defineCollection({
  type: 'data',
  schema: z.object({
    semester: z.string(),
    events: z.array(z.object({
      title: z.string(),
      description: z.string(),
      date: z.string(),
      slides: z.string().url().optional(),
      notebook: z.string().url().optional(),
      recording: z.string().url().optional(),
      audioSummary: z.string().optional(),
      tags: z.array(z.enum([
        'social',
        'workshop',
        'speaker',
        'competition',
        'career',
        'technical'
      ]))
    }))
  })
});

const competitions = defineCollection({
  type: 'data',
  schema: ({ image }) => z.array(z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    status: z.enum(['upcoming', 'past']),
    link: z.string(),
    thumbnail: image(),
    highlights: z.array(z.string()),
    gallery: z.array(image()).optional(),
    winners: z.array(z.object({
      place: z.number(),
      team: z.string().optional(),
      members: z.array(z.string()),
      prize: z.string().optional(),
      projectLink: z.string().url().optional()
    })).optional()
  }))
});

export const collections = {
  board,
  alumni,
  projects,
  sponsors,
  events,
  competitions
};
