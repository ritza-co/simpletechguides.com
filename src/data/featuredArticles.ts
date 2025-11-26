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
    title: 'Getting Started with Bruin',
    description: 'Learn how to build a complete data pipeline with Bruin. Load CSV files, transform data with SQL, and create business analytics tables using this open-source ETL tool.',
    author: 'Simple Tech Guides',
    date: 'Nov 24, 2025',
    category: 'Guides',
    image: '/img/guides/getting-started-with-bruin/cover.png',
    link: '/guides/getting-started-with-bruin',
    featured: true,
  },
  {
    title: 'How to Create a Timeline',
    description: 'Learn how to create timelines in Excel, Word, PowerPoint, Google Sheets, Preceden, and JavaScript. Step-by-step guides with examples for each tool.',
    author: 'Simple Tech Guides',
    date: 'Nov 5, 2025',
    category: 'Guides',
    image: '/img/guides/how-to-create-timeline/cover.png',
    link: '/guides/how-to-create-a-timeline',
    featured: true,
  },
  {
    title: 'Using VS Code, GitHub, and AMP Code for technical writing on macOS',
    description: 'A step-by-step guide on how to set up VS Code, GitHub, and AMP Code for technical writing on macOS.',
    author: 'Simple Tech Guides',
    date: 'Nov 4, 2025',
    category: 'Guides',
    image: '/img/guides/using-vs-code-amp-code-and-github-for-technical-writing/cover.png',
    link: '/guides/vs-amp-code-set-up-guide',
    featured: true,
  },
  {
    title: 'Dash0 vs Honeycomb vs New Relic',
    description: 'A practical comparison of Dash0, Honeycomb, and New Relic for Kubernetes monitoring, covering setup time, pricing models, and developer experience.',
    author: 'Simple Tech Guides',
    date: 'Nov 11, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/dash0-honeycomb-newrelic/cover.png',
    link: '/comparisons/dash0-vs-honeycomb-vs-new-relic',
    featured: true,
  },
  {
    title: 'Firebase vs Supabase vs Appwrite: We Built the Same App Three Times',
    description: 'Building a shopping list app on Firebase, Supabase, and Appwrite to compare setup experience, database models, security approaches, and developer tooling.',
    author: 'Simple Tech Guides',
    date: 'Nov 12, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/firebase-supabase-appwrite/cover.jpg',
    link: '/comparisons/firebase-vs-supabase-vs-appwrite',
    featured: true,
  },
  {
    title: "A Noob's Guide to Kubernetes Monitoring: SigNoz vs DataDog vs Grafana",
    description: "A beginner's guide to Kubernetes monitoring, comparing SigNoz, DataDog, and Grafana for ease of setup, developer experience, and cost.",
    author: 'Simple Tech Guides',
    date: 'Nov 6, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/signoz-datadog-grafana/cover.png',
    link: '/comparisons/signoz-vs-datadog-vs-grafana',
    featured: true,
  },
  {
    title: 'Building Real-Time Apps with Cloudflare Workers and RedwoodSDK',
    description: 'Compare building real-time polling applications with Cloudflare Workers and RedwoodSDK. See the differences in development experience, code patterns, and deployment.',
    author: 'Simple Tech Guides',
    date: 'Oct 21, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/cloudflare-rwsdk-real-time/cover.png',
    link: '/comparisons/cloudflare-workers-vs-redwoodsdk-real-time-apps',
    featured: true,
  },
  {
    title: 'Best SERP API Comparison 2025: SerpAPI vs Exa vs Tavily',
    description: 'Comprehensive benchmark testing of 5 SERP APIs. We measured speed, pricing, and features to help you choose the right API for SEO monitoring, AI agents, or web scraping.',
    author: 'Simple Tech Guides',
    date: 'Oct 17, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/serp-api/cover.png',
    link: '/comparisons/best-serp-api-comparison-serpapi-exa-tavily',
  },
  {
    title: 'Railway vs Vercel for Full-Stack Applications',
    description: 'Compare Railway and Vercel for deploying full-stack applications. Learn about their features, pricing, and which platform suits your needs.',
    author: 'Simple Tech Guides',
    date: 'Oct 28, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/vercel-vs-railway/cover.png',
    link: '/comparisons/vercel-vs-railway',
  },
  {
    title: 'Vercel vs Render',
    description: 'Complete comparison of Vercel and Render for deploying full-stack applications—architecture, pricing, developer experience, and migration.',
    author: 'Simple Tech Guides',
    date: 'Oct 30, 2025',
    category: 'Comparisons',
    image: '/img/comparisons/vercel-vs-render/cover.png',
    link: '/comparisons/vercel-vs-render',
  },
];

export const recentArticles: Article[] = [];
