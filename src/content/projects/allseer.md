---
title: AllSeer
order: 8
year: 2026
status: in-development
studio: null
employmentType: personal
platforms: [Local]
teamSize: Individual
duration: Aug 2026
role: Solo Developer
tagline: A local research monitor. Each day's top stories and niche finds per topic, summarised by a local LLM. No paid APIs, no cloud.
thumb: ""
genres: [research, tooling]
tech: [Python, FastAPI, SQLite FTS5, llama.cpp, Ollama, pytest]
keyInsights:
  - "Set up to run a 30B mixture-of-experts model (Qwen3-30B-A3B) locally on a 16 GB GPU."
  - "No paid APIs, no cloud, with a headless mode for scheduled runs."
  - "Built with Claude, covered by 44 pytest tests."
gallery: []
---

## Role & Responsibilities
Built with Claude, and covered by 44 pytest tests. It runs locally: no paid APIs, no cloud.

## What it does
- For each topic, finds the day's top 3 stories plus 3–5 niche finds from Hacker News, RSS feeds, GitHub and arXiv. SearXNG is optional; Reddit is off by default.
- Scores them against preferred topics and negatives, summarises them with a local LLM, and archives the rest.
- Stores everything in SQLite with full-text search, and has a writer that drafts LinkedIn posts from a find.
- Has a headless mode for scheduled runs.

## How it's built
Python, FastAPI + Uvicorn, httpx, trafilatura and SQLite FTS5. The LLM runs behind an OpenAI-compatible API (llama.cpp or Ollama), set up to run a 30B mixture-of-experts model (Qwen3-30B-A3B) on a 16 GB GPU.

The repo is private for now.
