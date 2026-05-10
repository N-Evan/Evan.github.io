import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context: { site?: URL }) {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const sorted = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  return rss({
    title: "Md. Nurusshafi Evan — Devlog",
    description:
      "Working notes from a gameplay programmer: post-mortems, design breakdowns, tooling experiments.",
    site: context.site ?? "https://n-evan.github.io",
    items: sorted.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.summary,
      link: `${base}/devlog/${p.id}/`,
      categories: p.data.tags,
      author: p.data.author,
    })),
    customData: `<language>en-us</language>`,
    stylesheet: undefined,
  });
}
