# Hacker News Japan 🇯🇵

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://kiefertaylorland.github.io/hacker-news-japan)

Search and explore Hacker News stories from Japan with advanced filtering and sorting options.

## Features

- **Full-text search** across Hacker News Japan stories
- **Advanced filtering** by story type (stories, comments, polls, jobs) and date range
- **Multiple sort options**: relevance, date, points, and comments
- **Pagination** support for browsing through results
- **Staggered card animations** for a polished, modern feel
- **Glassmorphism UI** with Tailwind CSS for an elegant design
- **Responsive** and mobile-friendly interface

## Tech Stack

- **Next.js 15** — React framework with static export support
- **React 19** — Latest UI library
- **TypeScript** — Type safety
- **Tailwind CSS v3** — Utility-first styling
- **Algolia HN Search API** — Real-time Hacker News search

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Build & Deploy

The app is automatically deployed to GitHub Pages on every push to `main` via GitHub Actions.

```bash
# Build static site locally
npm run build

# Serve static output locally (optional)
npx serve out
```

The workflow:
1. Pushes to `main` trigger the GitHub Actions workflow
2. Next.js builds the static site with `output: 'export'`
3. Artifacts are uploaded to GitHub Pages
4. Site is live at [https://kiefertaylorland.github.io/hacker-news-japan](https://kiefertaylorland.github.io/hacker-news-japan)

## License

MIT
