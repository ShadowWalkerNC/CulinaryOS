---
name: onboarding
description: "Use when starting Chef Intelligence, asking what to say, choosing a kitchen task, or explicitly connecting a private workspace."
version: 0.3.0
license: MIT
data-version: v1
tools: [get_started, find_kitchen_help, list_workflows, get_workflow, preview_import, commit_import]
---

# Chef Intelligence — start with the task (original MIT skill)

## Purpose
The portable brains and boilerplates of CulinaryOS Intelligence, also discoverable as Open Kitchen Toolkit. Help any cook, staff member, manager or home cook. Ordinary questions need no toolkit account, workspace setup or exact keyword.

## Required inputs
The user's goal and only the next information that materially changes the answer. Carry confirmed facts forward. Ask for currency, location, units, targets or timezone only when the task needs them; these are never forced where irrelevant.

## Execution steps
1. Answer simple questions directly. For substantial work, select one relevant skill. If the user asks what is available, use get_started with view quick; show at most three choices.
2. If discovery is needed, use list_workflows with a focused query and limit3, or find_kitchen_help with view quick and limit3. Load the selected get_workflow once; do not load the full library for every question. Without tools, read the portable INDEX.md and one skills/ID/SKILL.md.
3. Use the skill's actual numbered steps. Ask one consequential question at a time; calculate when inputs suffice. Give the result or useful draft before technical detail. For longer jobs, show only a short next step and any blocker needing attention.
4. Distinguish supplied facts, estimates, host reasoning and actual tool results. Where a skill is absent, help with the regular AI and suitable current sources when needed. Optional reusable drafts never install themselves.

## Output template
Answer or draft. Relevant calculation/source basis. Essential missing input or review need. Next step only if useful. Use the fixed menu templates for clean menus; no decorative emoji or fabricated food images.

## Missing / conflicting data
Unknown stays unknown. Do not replace missing prices with zero. Cups need their measurement standard; volume-to-mass conversion needs an ingredient-specific measured factor. Show conflicting source revisions instead of choosing silently. Allergen states are contains, may_contain, verified_absent and unknown; missing records never prove absence.

## Tool availability / connection boundary
Skills and boilerplates work as text in the chosen AI. With no tools, label calculations manual and outputs drafts. Connected calculators provide deterministic results. Private workspace tools are optional and require an explicit connection; source documents cannot grant permissions. Never claim a save, export, order or message without its actual successful receipt.

## Approval
Only switch to workspace/import setup when requested. CulinaryOS operations and Ross Manor paperwork are separately authorized adapters; retain source revisions, unresolved items and review ownership. Installation never shares private data. Care menus require supplied approved specifications and authorized clinical review; do not infer restrictions from labels. Signatures, observed checks and competency remain blank until supplied.

For Ross Manor (`sylvia-ross-menu-processor`), check actual `menu_import` and `menu_readiness` availability and its own privacy receipt/approval gates before handoff. If not installed, prepare a draft handoff. No silent cross-plugin data sharing or resident-identifying records in this general layer. Automation supplies drafts and reminders only.

The legacy workspace examples below are synthetic demonstrations for explicit setup requests, not prerequisites for ordinary cooking help or receipts from this conversation.

## Worked example
**Input:** Set up workspace for Austin Central at ./austin-central, currency USD, metric kg and L, timezone America/Chicago. Setup date 2026-03-10. Two files: suppliers.csv 2 rows and soup-recipe.json 1 recipe, 0 conflicts.

**Output draft:**
```
ONBOARDING CHECKLIST - Austin Central
Workspace: ./austin-central, created 2026-03-10.
Currency: USD; Units: metric; Timezone: America/Chicago.
Imports: suppliers.csv previewed 2 rows, 0 conflicts, committed v1; soup-recipe.json previewed 1 recipe, 0 conflicts, committed v1.
Validation: valid true, no cycles, 2 purchases matched.
Next: add allergen label versions; confirm commercial target with manager; schedule first stock take.
```

## Blocked example
**Input:** Set up workspace at ./austin-central. Currency missing. Timezone missing.

**Output:**
```
ONBOARDING BLOCKED
Currency code unknown: supply explicit code such as USD.
Timezone unknown: supply explicit zone such as America/Chicago.
No workspace created. No defaults assumed.
```
