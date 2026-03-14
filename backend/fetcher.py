import feedparser
import logging

logger = logging.getLogger(__name__)

RSS_FEEDS = [
    # Al Jazeera — Middle East section
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    # BBC — Middle East
    ("BBC News", "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml"),
    # Times of Israel
    ("Times of Israel", "https://www.timesofisrael.com/feed/"),
    # Jerusalem Post
    ("Jerusalem Post", "https://www.jpost.com/Rss/RssFeedsHeadlines.aspx"),
    # Reuters World News (fallback — feed sometimes redirects)
    ("Reuters", "https://feeds.reuters.com/reuters/worldNews"),
    # Haaretz English
    ("Haaretz", "https://www.haaretz.com/srv/haaretz-articles.rss"),
    # The Guardian — Middle East
    ("The Guardian", "https://www.theguardian.com/world/middleeast/rss"),
]

KEYWORDS = [
    "iran", "israel", "idf", "irgc", "tehran", "tel aviv",
    "airstrike", "air strike", "missile", "drone", "hezbollah", "hamas",
    "explosion", "attack", "nuclear", "strike", "houthi", "beirut",
    "gaza", "west bank", "syria", "lebanon", "iraq", "yemen",
    "ballistic", "rocket", "cyber", "naval", "warship", "ceasefire",
    "sanctions", "military operation", "ground operation",
]


def fetch_all_articles() -> list[dict]:
    articles = []
    seen_urls = set()

    for source_name, feed_url in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            feed_title = feed.feed.get("title", source_name)

            for entry in feed.entries:
                url = entry.get("link", "")
                if not url or url in seen_urls:
                    continue

                title = entry.get("title", "")
                summary = entry.get("summary", "") or entry.get("description", "")
                text = (title + " " + summary).lower()

                if not any(kw in text for kw in KEYWORDS):
                    continue

                seen_urls.add(url)
                articles.append({
                    "title": title,
                    "description": summary,
                    "url": url,
                    "source": feed_title,
                    "published": entry.get("published", ""),
                })

            logger.info(f"Fetched {len(feed.entries)} entries from {source_name}")
        except Exception as e:
            logger.warning(f"Failed to fetch {source_name} ({feed_url}): {e}")

    logger.info(f"Total relevant articles fetched: {len(articles)}")
    return articles
