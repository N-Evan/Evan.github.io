---
title: WhereIsOurMoney
order: 6
year: 2026
status: shipped
studio: null
employmentType: personal
platforms: [Web]
teamSize: Individual
duration: Sep–Oct 2026
role: Solo Developer
tagline: A shared expense tracker for two, so my wife and I can track joint spending without handing our data to a third party.
thumb: ""
genres: [finance, web app]
tech: [React 18, Vite, Tailwind v4, Cloudflare Workers, Cloudflare D1, Vitest]
keyInsights:
  - "First full-stack version (UI, API with auth, database schema, tests) committed under 2 hours after the repo was created."
  - "Built with Claude from 3 written design specs; 10 of 13 commits co-authored by Claude."
  - "Deployed on Cloudflare Workers, with D1 (SQLite) and tests running inside workerd."
gallery: []
---

## Role & Responsibilities
The first full-stack version (UI, API with auth, database schema, tests) was committed under 2 hours after the repo was created. I built it with Claude from 3 written design specs, and 10 of its 13 commits are co-authored by Claude.

My wife and I use it to track shared spending without handing our data to a third party.

## What it does
- A shared pot: records who paid, flags personal purchases, and toggles between joint-only and everything.
- Accounts (bank, cash, bKash, credit cards with billing cycles) and income.
- Amounts stored as integer paisa (BDT).
- Mobile-first logging plus a desktop dashboard, installable as a PWA.

## How it's built
A React 18, Vite and Tailwind v4 frontend; a Cloudflare Worker API with passcode/session auth and KV rate limiting; Cloudflare D1 (SQLite) with migrations; and Vitest tests running inside workerd. Deployed on Cloudflare Workers.

The repo is private for now.
