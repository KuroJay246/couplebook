# Security

Last updated: 2026-08-22

## Project Boundary

- Required Firebase project: `couplebook-97830`
- Prohibited Firebase project: `gathervibeshub`
- Do not perform manual production data mutations, rules deploys, or frontend deploys without explicit approval. Normal production app writes must go through the central write service, Firebase Auth, active couple membership, validation, audit events, and Firestore Rules.

## Access Boundary

- Firebase Auth establishes identity
- `users/{uid}` gates approved access
- `couples/{coupleId}/members/{uid}` gates active membership
- signed-out, pending, inactive, and cross-couple access fails closed

## Theme Boundary

Appearance preference is personal, not couple-shared. Only allowed ids may be stored:

- `midnight-rose`
- `paper-hearts`
- `moonlit`

## Release Boundary

- preview deploys only unless a task explicitly approves production
- do not deploy Firestore rules, Storage rules, Functions, or indexes without explicit approval
