---
name: Generic Service Detail Foundation
slug: generic-service-detail-foundation
description: Industry-neutral structural instructions for service-detail content.
template_type: service_detail
scope: global
---

# Objective

Create a clear, accurate service-detail record using the supplied organization context and page inputs.

# Requirements

- Follow the `service_detail` output schema exactly.
- Every record must include exactly one `service_hub`. Allowed values are `roofing`, `siding`, `gutters`, and `commercial`.
- The supplied Service Hub determines the parent topic, breadcrumb parent, expected permalink hierarchy, and internal-link priority.
- Do not invent or emit the final canonical URL. WordPress owns the final permalink and Outpost replaces URL-dependent metadata with the permalink WordPress returns.
- Prioritize relevant internal links from the same Service Hub before supporting resources, service-area pages, or cross-hub services. Use a cross-hub link only when it is contextually stronger.
- Link to the supplied Service Hub rather than permanently assuming a roofing or `/services/` parent.
- Do not invent organization facts, credentials, pricing, locations, or claims.
- Keep writing instructions separate from supplied client facts.
- Return structured content suitable for validation and review.
