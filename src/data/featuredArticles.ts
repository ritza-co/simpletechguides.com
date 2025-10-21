export interface Article {
  title: string;
  description: string;
  author: string;
  date: string;
  category: string;
  image?: string;
  link: string;
  featured?: boolean;
}

export const featuredArticles: Article[] = [
  {
    title: 'Building Real-Time Apps with Cloudflare Workers and RedwoodSDK',
    description: 'Compare building real-time polling applications with Cloudflare Workers and RedwoodSDK. See the differences in development experience, code patterns, and deployment.',
    author: 'Simple Tech Guides',
    date: 'Oct 21, 2025',
    category: 'Comparisons',
    image: '/assets/cloudflare-rwsdk-real-time/redwood-cf.png',
    link: '/comparisons/cloudflare-workers-vs-redwoodsdk-real-time-apps',
    featured: true,
  },
  {
    title: 'Best SERP API Comparison 2025: SerpAPI vs Exa vs Tavily',
    description: 'Comprehensive benchmark testing of 5 SERP APIs. We measured speed, pricing, and features to help you choose the right API for SEO monitoring, AI agents, or web scraping.',
    author: 'Simple Tech Guides',
    date: 'Oct 17, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/serp-api/serpcover.png',
    link: '/comparisons/best-serp-api-comparison-serpapi-exa-tavily',
  },
];

export const recentArticles: Article[] = [];
