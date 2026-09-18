// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://mcp-tool-shop-org.github.io',
  base: '/synthesis',
  integrations: [
    starlight({
      title: 'Synthesis',
      description: 'Synthesis handbook',
      // Remote PNG 200s; Starlight favicon must be .ico/.gif/.jpg/.png/.svg
      // (data-URI fails the extension check). Do not leave /synthesis/favicon.svg.
      favicon:
        'https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/synthesis/readme.png',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/mcp-tool-shop-org/synthesis' },
      ],
      sidebar: [
        { label: 'Handbook', items: [{ autogenerate: { directory: 'handbook' } }] },
      ],
      customCss: ['./src/styles/starlight-custom.css'],
      disable404Route: true,
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: 'image/svg+xml',
            href: 'data:image/svg+xml;utf8,' +
              encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#27272a"/><text x="16" y="23" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#fafafa">S</text></svg>',
              ),
          },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:title', content: 'Synthesis' },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:description',
            content:
              'Deterministic detection of relational failure modes — agency, reassurance, topic-pivot, performative empathy, grounded uptake — plus a composed relational_posture summary. No LLM judge, no probabilistic scoring; just auditable evidence.',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content:
              'https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/synthesis/readme.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:url',
            content: 'https://mcp-tool-shop-org.github.io/synthesis/',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content:
              'https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/synthesis/readme.png',
          },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
