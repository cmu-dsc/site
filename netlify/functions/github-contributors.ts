import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

interface NetlifyMetadata {
  github_contributors?: Contributor[];
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
    if (!metadata.github_contributors) {
      throw new Error('No cached contributors found');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(metadata.github_contributors),
    };
  } catch (error) {
    console.error('Error fetching cached contributors:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'CACHE_ERROR',
        message: 'Failed to fetch contributor data'
      }),
    };
  }
};