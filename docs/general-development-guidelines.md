# General Development Guidelines

## General Rules

- Focus on keeping the code:
  1. Readable
  2. Scalable

## Error Handling

- Avoid using unnecessary try-catch patterns when errors are already handled by the outer scope. Use try-catch only when necessary.

- Prefer using the early return pattern to validate constraints.