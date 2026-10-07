---
title: SortMyLife
order: 9
year: 2026
status: in-development
studio: null
employmentType: personal
platforms: [Web]
teamSize: Individual
duration: Aug–Sep 2026
role: Solo Developer
tagline: A gamified personal organizer. Tasks scored by what to do next, focus timer, habits, calendar fitting and a Telegram bot.
thumb: ""
genres: [productivity, web app]
tech: [SvelteKit 2, Svelte 5, Node 24, node:sqlite, Tailscale]
keyInsights:
  - "Schema migrations v1→v8, each tested on a copy of the live database."
  - "Multi-user auth (scrypt, DB sessions, login throttling) and an admin panel."
  - "Built with Claude and self-hosted, reached over Tailscale."
gallery: []
---

## Role & Responsibilities
Built with Claude. Its schema has gone through migrations v1→v8, each tested on a copy of the live database.

## What it does
- Tasks with a "what should I do next?" score, effort estimates and blocking.
- A focus timer, habits with streaks, and a calendar that fits tasks into free gaps.
- A Telegram bot for reminders and quick capture, XP and levels, and an installable PWA.

## How it's built
SvelteKit 2 (Svelte 5) on Node 24 with the built-in `node:sqlite`. Multi-user auth (scrypt, DB sessions, login throttling) and an admin panel. Self-hosted, and reached over Tailscale.

## Planned
Not built yet: AI-assisted task focus, spotting tendencies, and turning loose notes (from Telegram or the web UI) into actionable tasks.

The repo is private for now.
