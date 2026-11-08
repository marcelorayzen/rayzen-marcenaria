# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite; local development first, with deployment/domain to be chosen later.

## Users

The first users are the **customer**, the **marceneiro**, responsible for constructive review and technical production release, and the **responsável por projeto e relacionamento com o cliente**, who registers the visit, develops the project, and records commercial conversations. The customer has their own restricted access to begin the briefing, contribute references and review the illustrative proposal. WhatsApp is the preferred channel for delivering an invitation; it does not itself authenticate the customer or authorize actions. Internal users use the product in the workshop and during the visit, on a notebook or mobile phone. Customer access never grants permission to alter technical data, calculate production outputs, or release fabrication.

## Product Purpose

Rayzen Marcenaria is a web platform for furniture design and production that connects visit records, environmental evidence, conversational decisions, parametric furniture, parts, and assembly. Its first proof of value is a project where photos, measurements, and text observations inform a 2D wall elevation and a 3D counter; a text agent can propose a change whose confirmed result stays synchronized with the parts list and revision history.

## Positioning

A single reviewed project revision is the source for its 3D representation and production outputs, so a change cannot silently leave those outputs out of sync.

## Operating Context

The initial operation has two internal users and begins the project at the customer site. The interface must support recording and reviewing the visit on a mobile phone or notebook, without presenting an unmeasured value as fabrication-ready. The first acceptance case is a counter with 800 × 720 × 500 mm external dimensions, 18 mm MDF, no doors, and no back panel. The top and base sit between two sides; therefore their width is 764 mm. Increasing the external width to 900 mm changes their width to 864 mm.

## Capabilities and Constraints

- The first vertical slice covers counter parameters, explicit deterministic panel rules, a proportional web 3D view, validation, and CSV export.
- The current slice is a single local demonstration. Project data and revision history are held in memory and disappear when the page is reloaded; persistent projects, multiple projects, accounts, and synchronization are not implemented.
- The Supabase production project has the initial governance migration applied, but the web interface is not connected to it yet and no customer/project data has been migrated or entered. Customer access will use Supabase phone authentication with a WhatsApp-delivered invitation and a one-time code sent by the configured phone provider to the invited number; identity, invitation/onboarding and project-scoped permissions must be specified and tested before enabling it.
- During an on-site visit, a logged-in user may capture a local offline draft. The interface must show whether it is local-only, pending synchronization, synchronized, failed, or in conflict. It must never silently overwrite a newer revision; customer confirmation, commercial validation, and technical release require a synchronized revision. After successful synchronization, signing out clears the local copy from the device. A user with unsynchronized data must explicitly choose to keep it for a later sync or discard it; the application never does either silently.
- Dimensions are in millimeters. Missing or estimated measurements must not be silently treated as verified manufacturing dimensions.
- AI is a central assisted capability: it may help interpret the visit, identify missing measurements and prepare explicit change proposals, including project-specific specifications such as hardware from an approved source. Deterministic domain rules remain the source of dimensions and parts, and an internal user must review and confirm a proposal before it changes the project. Creating access/project records explicit, versioned consent for operational storage, authorized future migration and governed product/AI improvement. Any transfer or reuse still requires a documented purpose, minimum data scope, destination, retention and access controls before it is enabled.
- A candidate source has been identified: the community [Fusion360-ExportCutlist](https://github.com/bluekeyes/Fusion360-ExportCutlist) add-in for Fusion 360 exports a CSV cut list. Its default CSV groups bodies by dimensions/material, uses a count and joined names field, and sorts length/width/height in descending size order. This loses original axes and may combine distinct same-size pieces; a real anonymized CSV must be tested before implementing or claiming support. The add-in produces a cut list, not sheet-nesting layout.
- A future cut-list import must preserve file provenance, map imported rows into a documented canonical parts schema, show preview and validation/reconciliation, and require operator confirmation. Imported cut lists are references to compare with the parametric model, not an authority that silently overwrites parameters or releases fabrication.
- Customer approval starts the internal review flow; it is not technical approval for production. The responsible project/commercial user records and validates the customer confirmation for the exact illustrative revision, then the marceneiro reviews the technical data and is the only person who can release a future production package. Only after that release may production outputs such as materials, accessories, cut information, labels and assembly instructions be generated for use.
- The initial model has no doors or back panel. Cutting optimization, labels, assembly documentation, CAD workers, persistence, chat-assisted edits, cut-plan import, and external customer workflows are future work unless explicitly implemented and documented.
- The current application is a public static demonstration hosted at `marcenaria.rayzen.com.br`. Its project data and revision history still exist only in browser memory; no accounts, persistence, customer records, files or synchronization are implemented in the interface. Supabase is the approved cloud foundation for those future capabilities, but connecting it requires an approved onboarding/provisioning path and role-permission tests first.
- The first planned prototype accepts photos, measurements, and text; video/voice capture and automatic room reconstruction are later work. Wall elevation is 2D while the initial furniture model remains 3D.

## Proposed Evolution

The next stages are described in [docs/BACKLOG-DESENVOLVIMENTO.md](./docs/BACKLOG-DESENVOLVIMENTO.md) and [docs/EVOLUCAO-FLUXO.md](./docs/EVOLUCAO-FLUXO.md). They are proposals, not capabilities of the current application:

1. Define provenance-aware domain data and privacy/storage decisions; persist projects and revisions.
2. Add photos, measurements, observations, and actionable visit follow-ups.
3. Model a wall in 2D and connect a parametric 3D counter to its environment and parts.
4. Prove structured change proposals with preview, confirmation, deterministic recalculation, and audit history before connecting a chat provider.
5. Expand modules, readiness checks, and import/reconciliation only after rules, sample files, and technical-release responsibilities are established.

## Brand Commitments

The provisional product name is Rayzen Marcenaria. The product is for Marcelo Augusto's operation.

## Evidence on Hand

The project brief contains a proposed workflow and a dimensional acceptance case. No validated physical pilot, customer testimonials, production results, or approved visual assets were provided; do not claim them.

## Product Principles

- Keep all outputs tied to one explicit project revision.
- Use deterministic, reviewable construction rules for manufacturing dimensions.
- Make assumptions and unverified measurements visible.
- Keep operator review between a design proposal and production release.
- Build an independently useful core that does not require an AI provider.
