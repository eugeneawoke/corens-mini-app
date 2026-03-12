# Prisma Notes

## Purpose

Track the gap between the full architecture package data model and the starter Prisma scaffold.

## Current State

- `schema.prisma` contains only the minimum anchor models for scaffold clarity
- relations, indexes, and history tables are intentionally incomplete
- hot-path matching SQL remains deferred

## Remaining Gaps

- add state, intent, trust-key, visibility, audit, and report tables
- add unique active-pair constraints
- add retention-aware lifecycle fields
