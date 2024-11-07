import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

const CACHE_DURATION = 6 * 60 * 60; // 6 hours in seconds

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface NetlifyMetadata {
  github_contributions?: ContributionDay[];
  last_updated?: number;
}

interface RateLimitResponse {
  resources: {
    core: {
      remaining: number;
      reset: number;
    };
  };
}

const fetchAllPages = async (baseUrl: string, token: string) => {
  // Add rate limit check at the start
  const rateLimit = await fetch('https://api.github.com/rate_limit', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  const rateLimitData = await rateLimit.json() as RateLimitResponse;
  if (rateLimitData.resources.core.remaining === 0) {
    throw new Error(`GitHub API rate limit exceeded. Resets at ${new Date(rateLimitData.resources.core.reset * 1000).toISOString()}`);
  }

  let page = 1;
  let allData: any[] = [];
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Add since parameter to base URL for time-based endpoints
  const urlWithDate = baseUrl.includes('?')
    ? `${baseUrl}&since=${oneYearAgo.toISOString()}`
    : `${baseUrl}?since=${oneYearAgo.toISOString()}`;

  while (true) {
    const url = `${urlWithDate}&page=${page}&per_page=100`;
    console.log(`Fetching page ${page}: ${url}`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      console.error('URL:', url);
      const text = await response.text();
      console.error('Response:', text);
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data) || data.length === 0) break;

    allData = [...allData, ...data];

    // Check for next page in Link header
    const linkHeader = response.headers.get('Link');
    if (!linkHeader || !linkHeader.includes('rel="next"')) {
      break;
    }

    page++;
  }

  return allData;
};

const handler: Handler = async (event, context) => {
  try {
    // Check for cached data first
    try {
      const cachedResponse = await fetch(
        `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/metadata`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`,
          },
        }
      );

      if (cachedResponse.ok) {
        const metadata = await cachedResponse.json() as NetlifyMetadata;
        if (
          metadata.github_contributions &&
          metadata.last_updated &&
          Date.now() / 1000 - metadata.last_updated < CACHE_DURATION
        ) {
          console.log('Returning cached data');
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(metadata.github_contributions),
          };
        }
      }
    } catch (error) {
      // If cache check fails, log and continue to try fresh data
      console.error('Cache check failed:', error);
    }

    // Validate environment variables
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set');
    }

    console.log('Fetching organization repositories...');
    const repos = await fetchAllPages(
      'https://api.github.com/orgs/cmu-dsc/repos',
      process.env.GITHUB_TOKEN
    );
    console.log(`Found ${repos.length} repositories`);

    const contributionMap = generateDateRange();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    console.log('Fetching activity for each repository...');
    for (const repo of repos) {
      console.log(`Processing ${repo.name}...`);
      try {
        const [commits, prs, issues] = await Promise.all([
          fetchAllPages(
            `https://api.github.com/repos/cmu-dsc/${repo.name}/commits`,
            process.env.GITHUB_TOKEN
          ),
          fetchAllPages(
            `https://api.github.com/repos/cmu-dsc/${repo.name}/pulls`,
            process.env.GITHUB_TOKEN
          ),
          fetchAllPages(
            `https://api.github.com/repos/cmu-dsc/${repo.name}/issues`,
            process.env.GITHUB_TOKEN
          )
        ]);

        // Process only contributions from the last year
        const processContribution = (date: string | undefined) => {
          if (date && contributionMap.has(date)) {
            const contributionDate = new Date(date);
            if (contributionDate >= oneYearAgo) {
              contributionMap.set(date, contributionMap.get(date)! + 1);
            }
          }
        };

        commits.forEach(commit => {
          processContribution(commit?.commit?.author?.date?.split('T')[0]);
        });

        prs.forEach(pr => {
          processContribution(pr?.created_at?.split('T')[0]);
        });

        issues.forEach(issue => {
          if (!issue.pull_request) {
            processContribution(issue?.created_at?.split('T')[0]);
          }
        });
      } catch (error) {
        console.error(`Error processing repo ${repo.name}:`, error);
      }
    }

    const maxContributions = Math.max(...Array.from(contributionMap.values()));
    const contributions: ContributionDay[] = Array.from(contributionMap.entries())
      .map(([date, count]) => ({
        date,
        count,
        level: getContributionLevel(count, maxContributions)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`Processed ${contributions.length} days of contributions`);

    // Cache the results
    if (process.env.NETLIFY_API_TOKEN && process.env.SITE_ID) {
      try {
        await fetch(
          `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/metadata`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              github_contributions: contributions,
              last_updated: Math.floor(Date.now() / 1000),
            }),
          }
        );
        console.log('Cached new data');
      } catch (error) {
        console.error('Failed to cache data:', error);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(contributions),
    };
  } catch (error) {
    console.error('Handler error:', error);
    // Return cached data as fallback if available, even if expired
    try {
      const cachedResponse = await fetch(
        `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/metadata`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`,
          },
        }
      );

      if (cachedResponse.ok) {
        const metadata = await cachedResponse.json() as NetlifyMetadata;
        if (metadata.github_contributions) {
          console.log('Returning stale cached data due to error');
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(metadata.github_contributions),
          };
        }
      }
    } catch (cacheError) {
      console.error('Failed to get stale cache:', cacheError);
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch contributions',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

const generateDateRange = () => {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const dates = new Map<string, number>();
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
    dates.set(d.toISOString().split('T')[0], 0);
  }
  return dates;
};

const getContributionLevel = (count: number, max: number): 0 | 1 | 2 | 3 | 4 => {
  if (count === 0) return 0;
  if (max === 0) return 0;

  // Use natural logarithm for scaling
  const logCount = Math.log(count + 1); // Add 1 to handle count = 1
  const logMax = Math.log(max + 1);
  const normalized = logCount / logMax;

  if (normalized <= 0.25) return 1;
  if (normalized <= 0.5) return 2;
  if (normalized <= 0.75) return 3;
  return 4;
};

export { handler };
