# Cloud Atlas — From the Internet to Intelligent Infrastructure

An interactive learning site and workshop deck: 23 scenes covering all 16 chapters, from a single web request to GPU inference fleets. Every lab runs on a local, documented simulation model. You don't need an AWS account, credentials, a backend or an API key.

## Run it

Open `dist/index.html` in Chrome, Edge or Firefox. It works offline (without internet it falls back to system fonts).

| Key | Action |
| --- | --- |
| → / Space, ← | Next / previous scene |
| E | Toggle Explore ↔ Engineer depth (protocols, formulas, caveats, code) |
| K | Knowledge check for the current chapter |
| G / L | Chapter overview / Cloud Lab (every simulator on its own) |
| N | Presenter notes (what to say, demo steps, questions, answers) |
| P | Separate presenter window (local file), synced to the main window |
| F | Presentation mode: distraction-free, larger type, full screen. Esc returns |

Progress, completed activities, knowledge checks, Studio designs and roadmap ticks are saved in the browser's localStorage. The site resumes at the last scene you viewed.

## Chapters and labs

| # | Chapter | Working interaction |
| --- | --- | --- |
| 0 | A request's journey | DNS → TLS → CDN hit/miss → load balancer → servers → data, step by step |
| 1 | Why the cloud exists | On-prem vs cloud capacity and cost over 3 years (weekly model) |
| 2 | Service models | Responsibility stack: on-prem / IaaS / PaaS / serverless / SaaS |
| 3 | Global infrastructure | Latency by Region from distance; AZ failure with app and DB redundancy |
| 4 | Building blocks | Architecture grows across 7 requirements in 3 compute styles; 24-service catalog |
| 5 | Networking | VPC rule engine: routes, IGW, NAT, public IPs, stateful SGs, stateless NACLs |
| 6 | Scaling & HA | Fluid queue simulator: autoscaling delay, health checks, AZ loss, LB strategies |
| 7 | Storage & databases | Follow-the-data flows; choose-the-storage exercise with explained trade-offs |
| 8 | Security | IAM policy lab: allow / explicit deny / implicit deny, least privilege |
| 9 | Deployment | CI/CD pipeline with injected failures; canary vs rolling vs blue/green; IaC code; containers vs VMs |
| 10 | Operations | Diagnose 5 incidents from metrics, logs and traces |
| 11 | Cost & Well-Architected | Budget, capacity, availability and ops trade-offs by pillar |
| 12 | Cloud for AI | LLM request (RAG, cache, streaming, GPU memory); CPU vs GPU; inference scaling (Erlang C) |
| 13 | ML pipelines | ML lifecycle with drift-triggered retraining; distributed processing (skew, shuffle) |
| 14 | Case studies | 10 architectures revealed component by component |
| 15 | Architecture Studio | 4 challenges, transparent validation, failure injection, A/B compare |
| 16 | Careers | 11 roles, roadmap checklist, portfolio projects, certifications in context |
| — | Reference | Searchable glossary, lab index, authoritative links |

## Project structure

```
src/core.js          shell: navigation, depth modes, progress, knowledge checks, presentation mode,
                     presenter window; primitives: canvas, loop, chart, flow diagram + packets,
                     stepper, controls, tabs
src/sim/*.js         pure simulation logic (no DOM): capacity, queue (Traffic + Erlang C), vpc, iam,
                     ai (LLM plan, CPU/GPU, distributed job), cost, studio validator
src/data/*.js        services catalog, case studies, careers, glossary, resources
src/scenes/s1–s7.js  chapter scenes (content, interaction, notes, checks)
src/styles.css       design tokens and components
build.mjs            bundles everything into dist/index.html (single file)
tools/sim-tests.mjs  unit tests for the simulation engines
tools/test.py        headless end-to-end test: every scene, every control, acceptance scenarios A–J
```

## Build and test

```bash
node build.mjs
node tools/sim-tests.mjs                 # 56 unit tests
python3 tools/test.py ./shots            # needs: pip install playwright && python -m playwright install chromium
```

## Accuracy notes

- No prices, quotas or infrastructure counts are presented as current facts. All cost figures are labeled illustrative and can be edited in Engineer mode. For real estimates, use the AWS Pricing Calculator.
- The shown Regions are a sample, and the AZ view is conceptual.
- Every simulator states its simplifications on screen (Engineer mode). The VPC and IAM labs model documented subsets of real behavior. They are not validation tools.
