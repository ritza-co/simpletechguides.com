import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Simple Tech Guides',
  tagline: 'Clear, concise technical guides for developers',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://simpletechguides.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'simpletechguides', // Usually your GitHub org/user name.
  projectName: 'simpletechguides', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'script',
      attributes: {
        src: 'https://plausible.io/js/pa-Z-bcTV7srVDaJREZASQ0s.js',
        async: 'true',
      },
    },
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()`,
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: false, // Disable docs since we're using blog plugins for guides
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          routeBasePath: 'articles',
          blogTitle: 'Tech Articles',
          blogDescription: 'In-depth technical articles and guides',
          blogSidebarTitle: 'Recent Articles',
          blogSidebarCount: 10,
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'comparisons',
        routeBasePath: 'comparisons',
        path: './comparisons',
        blogTitle: 'Tool Comparisons',
        blogDescription: 'Detailed comparisons of developer tools and APIs',
        blogSidebarTitle: 'All Comparisons',
        blogSidebarCount: 0,
        showReadingTime: true,
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'warn',
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'guides',
        routeBasePath: 'guides',
        path: './guides',
        blogTitle: 'Guides',
        blogDescription: 'Guides',
        blogSidebarTitle: 'All Guides',
        blogSidebarCount: 0, // Hide sidebar to match comparisons
        showReadingTime: true,
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'warn',
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Simple Tech Guides',
      logo: {
        alt: 'Simple Tech Guides Logo',
        src: 'img/logo.png',
      },
      items: [
        {to: '/comparisons', label: 'Comparisons', position: 'left'},
        {to: '/guides', label: 'Guides', position: 'left'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Content',
          items: [
            {
              label: 'Guides',
              to: '/guides/intro',
            },
            {
              label: 'Articles',
              to: '/articles',
            },
            {
              label: 'Comparisons',
              to: '/comparisons',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Simple Tech Guides. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
