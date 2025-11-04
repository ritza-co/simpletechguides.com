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
    title: 'Using VS Code, GitHub, and AMP Code for technical writing on macOS',
    description: 'A step-by-step guide on how to set up VS Code, GitHub, and AMP Code for technical writing on macOS.',
    author: 'Simple Tech Guides',
    date: 'Nov 4, 2025',
    category: 'Guides',
    image: '/techwriting.jpg',
    link: '/guides/vs-amp-code-set-up-guide',
    featured: true,
  },
  {
    title: 'Building Real-Time Apps with Cloudflare Workers and RedwoodSDK',
    description: 'Compare building real-time polling applications with Cloudflare Workers and RedwoodSDK. See the differences in development experience, code patterns, and deployment.',
    author: 'Simple Tech Guides',
    date: 'Oct 21, 2025',
    category: 'Comparisons',
    image: '/redwood-cloudflare.jpg',
    link: '/comparisons/cloudflare-workers-vs-redwoodsdk-real-time-apps',
    featured: true,
  },
  {
    title: 'Best SERP API Comparison 2025: SerpAPI vs Exa vs Tavily',
    description: 'Comprehensive benchmark testing of 5 SERP APIs. We measured speed, pricing, and features to help you choose the right API for SEO monitoring, AI agents, or web scraping.',
    author: 'Simple Tech Guides',
    date: 'Oct 17, 2025',
    category: 'Comparisons',
    image: '/serpapi.jpg',
    link: '/comparisons/best-serp-api-comparison-serpapi-exa-tavily',
  },
  {
    title: 'Railway vs Vercel for Full-Stack Applications',
    description: 'Compare Railway and Vercel for deploying full-stack applications. Learn about their features, pricing, and which platform suits your needs.',
    author: 'Simple Tech Guides',
    date: 'Oct 28, 2025',
    category: 'Comparisons',
    image: '/railway-vercel.jpg',
    link: '/comparisons/vercel-vs-railway',
  },
  {
    title: 'Vercel vs Render',
    description: 'Complete comparison of Vercel and Render for deploying full-stack applications—architecture, pricing, developer experience, and migration.',
    author: 'Simple Tech Guides',
    date: 'Oct 30, 2025',
    category: 'Comparisons',
    image: '/vercel-vs-render.jpg',
    link: '/comparisons/vercel-vs-render',
  },
];

export const recentArticles: Article[] = [];
