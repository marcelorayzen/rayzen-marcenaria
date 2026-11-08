# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite; local development first, with deployment/domain to be chosen later.

## Users

Marcelo Augusto and the Rayzen Marcenaria operation use the product to turn customer requirements into reviewed furniture designs and manufacturing information. Customers will use the web experience to submit requirements, references, and measurements, review a proposal, and follow released guidance.

## Product Purpose

Rayzen Marcenaria is a web platform for furniture design and production that connects visit records, environmental evidence, conversational decisions, parametric furniture, parts, and assembly. Its first proof of value is a project where photos, measurements, and text observations inform a 2D wall elevation and a 3D counter; a text agent can propose a change whose confirmed result stays synchronized with the parts list and revision history.

## Positioning

A single reviewed project revision is the source for its 3D representation and production outputs, so a change cannot silently leave those outputs out of sync.

## Operating Context

The initial user is validating real furniture in a small marcenaria operation. The first acceptance case is a counter with 800 × 720 × 500 mm external dimensions, 18 mm MDF, no doors, and no back panel. The top and base sit between two sides; therefore their width is 764 mm. Increasing the external width to 900 mm changes their width to 864 mm.

## Capabilities and Constraints

- The first vertical slice covers counter parameters, explicit deterministic panel rules, a proportional web 3D view, validation, and CSV export.
- The current slice is a single local demonstration. Project data and revision history are held in memory and disappear when the page is reloaded; persistent projects, multiple projects, accounts, and synchronization are not implemented.
- The Supabase production project has the initial governance migration applied, but the web interface is not connected to it yet and no customer/project data has been migrated or entered.
- Dimensions are in millimeters. Missing or estimated measurements must not be silently treated as verified manufacturing dimensions.
- A future chat may help interpret requests and prepare explicit change proposals, but deterministic domain rules remain the source of dimensions and parts. The operator must review and confirm a proposal before it changes the project. Data sharing with an AI provider is contractually authorized by the operation; the specific AI provider, retention configuration and request scope remain to be implemented and documented.
- A candidate source has been identified: the community [Fusion360-ExportCutlist](https://github.com/bluekeyes/Fusion360-ExportCutlist) add-in for Fusion 360 exports a CSV cut list. Its default CSV groups bodies by dimensions/material, uses a count and joined names field, and sorts length/width/height in descending size order. This loses original axes and may combine distinct same-size pieces; a real anonymized CSV must be tested before implementing or claiming support. The add-in produces a cut list, not sheet-nesting layout.
- A future cut-list import must preserve file provenance, map imported rows into a documented canonical parts schema, show preview and validation/reconciliation, and require operator confirmation. Imported cut lists are references to compare with the parametric model, not an authority that silently overwrites parameters or releases fabrication.
- Customer visual approval is not technical approval for production. In the intended operation, only the marceneiro reviews and releases any future production package; the commercial representative records the customer approval but cannot release fabrication.
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
