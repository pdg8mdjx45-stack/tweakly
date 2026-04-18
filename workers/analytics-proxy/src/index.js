// Tracr Analytics Proxy Worker
// Queries Cloudflare Web Analytics GraphQL API and returns visitor stats

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function getPeriodDates(period) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start;
  if (period === 'today') {
    start = end;
  } else if (period === '7d') {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    start = d.toISOString().split('T')[0];
  } else if (period === '90d') {
    const d = new Date(now); d.setDate(d.getDate() - 90);
    start = d.toISOString().split('T')[0];
  } else {
    // 30d default
    const d = new Date(now); d.setDate(d.getDate() - 30);
    start = d.toISOString().split('T')[0];
  }
  return { start, end };
}

function getPrevPeriodDates(period) {
  const now = new Date();
  let days = 30;
  if (period === 'today') days = 1;
  else if (period === '7d') days = 7;
  else if (period === '90d') days = 90;

  const end = new Date(now); end.setDate(end.getDate() - days);
  const start = new Date(end); start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

async function queryAnalytics(accountId, siteTag, apiToken, dateStart, dateEnd) {
  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          rumWebsiteTag: rumPageloadEventsAdaptiveGroups(
            filter: { AND: [
              { siteTag: "${siteTag}" },
              { date_geq: "${dateStart}" },
              { date_leq: "${dateEnd}" }
            ]}
            limit: 1
            orderBy: []
          ) {
            sum { visits pageViews }
            uniq { uniques }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`CF GraphQL error: ${res.status}`);
  }

  const json = await res.json();
  const data = json?.data?.viewer?.accounts?.[0]?.rumWebsiteTag?.[0];
  return {
    visits: data?.sum?.visits ?? 0,
    pageViews: data?.sum?.pageViews ?? 0,
    uniques: data?.uniq?.uniques ?? 0,
  };
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';

    try {
      const { start, end } = getPeriodDates(period);
      const prev = getPrevPeriodDates(period);

      const [current, previous] = await Promise.all([
        queryAnalytics(env.CF_ACCOUNT_ID, env.CF_SITE_TAG, env.CF_API_TOKEN, start, end),
        queryAnalytics(env.CF_ACCOUNT_ID, env.CF_SITE_TAG, env.CF_API_TOKEN, prev.start, prev.end),
      ]);

      const trend = previous.visits > 0
        ? Math.round(((current.visits - previous.visits) / previous.visits) * 100)
        : null;

      return new Response(JSON.stringify({
        period,
        dateStart: start,
        dateEnd: end,
        visits: current.visits,
        pageViews: current.pageViews,
        uniques: current.uniques,
        trend,
        previous: previous.visits,
      }), { headers: CORS_HEADERS });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  },
};
