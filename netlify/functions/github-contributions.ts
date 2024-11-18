import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface NetlifyMetadata {
  github_contributions?: ContributionDay[];
  last_updated?: number;
}

export const handler: Handler = async (_event, _context) => {
  try {
    const cachedResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/metadata`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`,
        },
      }
    );

    if (!cachedResponse.ok) {
      throw new Error('Failed to fetch cached data');
    }

    const metadata = await cachedResponse.json() as NetlifyMetadata;
    if (!metadata.github_contributions) {
      throw new Error('No cached contributions found');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(metadata.github_contributions),
    };
  } catch (error) {
    console.error('Error fetching cached contributions:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'CACHE_ERROR',
        message: 'Failed to fetch contribution data'
      }),
    };
  }
};