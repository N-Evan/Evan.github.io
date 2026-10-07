---
title: ADGM Smart Induction
order: 0
year: 2025
status: shipped
studio: XR23
employmentType: employee
platforms:
  - WebGL
teamSize: 10
duration: 5 months
role: Lead Developer
tagline: A Unity WebGL induction tour that walks new employees through a virtual ADGM office, with a RAG chatbot built in.
thumb: ""
genres:
  - Office Tour
  - Induction
tech:
  - Unity
  - C#
  - WebGL
  - Python
  - FastAPI
  - LangChain
  - Docker
  - Ollama
  - ChromaDB
  - Azure
links: {}
keyInsights:
  - "RAG chatbot, API and ingestion included, built with Claude in about 2 hours. It was my first chatbot."
  - "Omnidirectional spriteboard: base version and audit tool in 1 hour with Claude, for work that normally takes 4+ hours."
  - "Built the tour's core: user navigation, dynamic scene streaming, and tour rails (guided and manual)."
gallery: []
snippets: []
featured: true
---

## Role & Responsibilities
Led the development of the smart induction platform, working closely with stakeholders, in a team of 10: 5 designers, 3 developers, a business analyst and a product owner. The tour covers 7 office floors, each fully explorable with guided paths.

**What I built:** the RAG chatbot and its API; the tour's core systems (user navigation, dynamic scene streaming, and tour rails, both guided and manual); and the UI in Unity.

**What I led:** development of the minigames, the interaction system and the UI systems.

Phase 1 ran from July to the end of November 2025. The WebGL build is a static deployment on Azure, and the backend runs in ADGM's Azure infrastructure.

## RAG chatbot
Built in November 2025 in about 2 hours, API and ingestion included, with no prior chatbot experience. I built the API and the ingestion, with Claude writing the code; a backend engineer helped with the deployments.

It's multi-agent and routed. Each agent type has its own memory store, and they all sit behind a single API: an agent-type field in the request payload picks which agent answers, and from which memory.

```text
  request  (payload carries an agent type)
     │
     ▼
  single API ── Python · FastAPI + LangChain · Docker
     │
     │ routes on agent type
     ├──────────────┬──────────────┐
     ▼              ▼              ▼
  agent A        agent B        agent …
     │              │              │
     ▼              ▼              ▼
  Chroma         Chroma         Chroma      one collection per agent
  collection A   collection B   collection …
     └──────────────┴──────┬───────┘
                           ▼
            Ollama: gemma3:4b chat model + embeddings
            (Azure VM in ADGM's infrastructure)
```

Ingestion chunks the source data and stores it in one Chroma collection per agent.

## Omnidirectional spriteboard
Base version and audit tool done in 1 hour with Claude, for work that would normally take 4+ hours of working out the math and tooling.

In September 2026, ADGM asked for a change in how the 3D characters look. I built 2D characters with a 3D look and feel to replace the 3D models, which put higher-quality characters into the 3D tour without breaking immersion.

## Learnings
One of the key challenges was delivering a large 3D environment over the web with low load times. Using Addressables to load and unload environment chunks only when needed cut <b>load time by 30%</b>.
