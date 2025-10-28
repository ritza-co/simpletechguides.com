import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {featuredArticles, recentArticles} from '@site/src/data/featuredArticles';

import styles from './index.module.css';

function ArticleCard({article, featured = false}) {
  return (
    <article className={clsx(styles.articleCard, featured && styles.featuredCard)}>
      <Link to={article.link} className={styles.articleLink}>
        <div className={styles.cardInner}>
          {article.image && (
            <div className={styles.articleImage}>
              <img src={article.image} alt={article.title} />
            </div>
          )}
          <div className={styles.articleContent}>
            <div className={styles.articleMeta}>
              <span className={styles.category}>{article.category}</span>
              <span className={styles.date}>{article.date}</span>
            </div>
            <Heading as="h2" className={styles.articleTitle}>
              {article.title}
            </Heading>
            <p className={styles.articleDescription}>{article.description}</p>
            <div className={styles.articleFooter}>
              <span className={styles.author}>{article.author}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function FeaturedSection() {
  return (
    <section className={styles.featuredSection}>
      <div className="container">
        <div className={styles.featuredGrid}>
          {featuredArticles.map((article, idx) => (
            <ArticleCard key={idx} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentArticles() {
  return (
    <section className={styles.recentSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Recent Articles
        </Heading>
        <div className={styles.articleGrid}>
          {recentArticles.map((article, idx) => (
            <ArticleCard key={idx} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="Clear, concise technical guides for developers">
      <main className={styles.magazineLayout}>
        <FeaturedSection />
        <RecentArticles />
      </main>
    </Layout>
  );
}
