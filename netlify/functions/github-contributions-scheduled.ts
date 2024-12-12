import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface RateLimitResponse {
  resources: {
    core: {
      remaining: number;
      reset: number;
    };
  };
}

interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

const fetchAllPages = async (baseUrl: string, token: string) => {
  let page = 1;
  let allData: any[] = [];
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const urlWithDate = baseUrl.includes('?')
    ? `${baseUrl}&since=${oneYearAgo.toISOString()}`
    : `${baseUrl}?since=${oneYearAgo.toISOString()}`;

  while (true) {
    const url = `${urlWithDate}&page=${page}&per_page=100`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data) || data.length === 0) break;

    allData = [...allData, ...data];

    const linkHeader = response.headers.get('Link');
    if (!linkHeader || !linkHeader.includes('rel="next"')) break;

    page++;
  }

  return allData;
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

  const logCount = Math.log(count + 1);
  const logMax = Math.log(max + 1);
  const normalized = logCount / logMax;

  if (normalized <= 0.25) return 1;
  if (normalized <= 0.5) return 2;
  if (normalized <= 0.75) return 3;
  return 4;
};

export const handler: Handler = async (_event, _context) => {
  try {
    console.log('Starting GitHub contributions update...');

    // Check rate limit
    const rateLimit = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const rateLimitData = await rateLimit.json() as RateLimitResponse;
    console.log(`Rate limit remaining: ${rateLimitData.resources.core.remaining}`);

    if (rateLimitData.resources.core.remaining === 0) {
      throw new Error(`GitHub API rate limit exceeded. Resets at ${new Date(rateLimitData.resources.core.reset * 1000).toISOString()}`);
    }

    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    // Fetch and process contributions
    const repos = await fetchAllPages(
      'https://api.github.com/orgs/cmu-dsc/repos',
      process.env.GITHUB_TOKEN
    );
    console.log(`Processing ${repos.length} repositories...`);

    const contributionMap = generateDateRange();
    const contributors = new Map<string, Contributor>();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    for (const repo of repos) {
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

      // Process commits
      commits.forEach(commit => {
        const date = commit?.commit?.author?.date?.split('T')[0];
        if (date && contributionMap.has(date)) {
          const contributionDate = new Date(date);
          if (contributionDate >= oneYearAgo) {
            // Update contribution map
            contributionMap.set(date, contributionMap.get(date)! + 1);

            // Update contributor stats
            const author = commit?.author;
            if (author) {
              const current = contributors.get(author.login) || {
                login: author.login,
                avatar_url: author.avatar_url,
                contributions: 0,
                html_url: author.html_url,
              };
              current.contributions += 1;
              contributors.set(author.login, current);
            }
          }
        }
      });

      // Process PRs
      prs.forEach(pr => {
        const date = pr?.created_at?.split('T')[0];
        if (date && contributionMap.has(date)) {
          const contributionDate = new Date(date);
          if (contributionDate >= oneYearAgo) {
            // Update contribution map
            contributionMap.set(date, contributionMap.get(date)! + 1);

            // Update contributor stats (PRs count as 2)
            const author = pr.user;
            if (author) {
              const current = contributors.get(author.login) || {
                login: author.login,
                avatar_url: author.avatar_url,
                contributions: 0,
                html_url: author.html_url,
              };
              current.contributions += 2;
              contributors.set(author.login, current);
            }
          }
        }
      });

      // Process issues
      issues.forEach(issue => {
        if (!issue.pull_request) { // Skip issues that are actually PRs
          const date = issue?.created_at?.split('T')[0];
          if (date && contributionMap.has(date)) {
            const contributionDate = new Date(date);
            if (contributionDate >= oneYearAgo) {
              // Update contribution map
              contributionMap.set(date, contributionMap.get(date)! + 1);

              // Update contributor stats
              const author = issue.user;
              if (author) {
                const current = contributors.get(author.login) || {
                  login: author.login,
                  avatar_url: author.avatar_url,
                  contributions: 0,
                  html_url: author.html_url,
                };
                current.contributions += 1;
                contributors.set(author.login, current);
              }
            }
          }
        }
      });
    }

    const maxContributions = Math.max(...Array.from(contributionMap.values()));
    const contributions: ContributionDay[] = Array.from(contributionMap.entries())
      .map(([date, count]) => ({
        date,
        count,
        level: getContributionLevel(count, maxContributions)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topContributors = Array.from(contributors.values())
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 12);

    console.log(`Found ${topContributors.length} contributors with ${contributions.length} contribution days`);

    // Cache the results
    const cacheResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/metadata`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_contributions: contributions,
          github_contributors: topContributors,
          last_updated: Math.floor(Date.now() / 1000),
        }),
      }
    );

    if (!cacheResponse.ok) {
      throw new Error('Failed to cache contributions data');
    }

    console.log('Successfully updated contributions data');
    return { statusCode: 200 };
  } catch (error) {
    console.error('Failed to update contributions:', error);
    return { statusCode: 500 };
  }
};
