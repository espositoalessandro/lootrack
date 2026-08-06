# Lootrack Roadmap

Lootrack is a local-first budgeting application built with Angular.

The application is designed to work primarily as an installable Progressive Web App, with IndexedDB as its immediate local datastore and optional cloud synchronization added later.

## Core principles

- Local-first: all user actions must work without a network connection.
- Offline-capable: the interface must remain usable when synchronization is unavailable.
- Backend-agnostic: application features must not depend directly on Google Sheets, CloudKit, or a future REST API.
- Mobile-first: the first interface is optimized for quick transaction entry on a phone.
- Progressive enhancement: desktop layouts, synchronization, and native integrations are added incrementally.
- User-owned data: users must be able to export and restore their data.

---

## v0.1 — Local foundation

**Goal:** Deliver a usable mobile budgeting app that stores all data locally.

### ~~Application foundation~~

* [x] Define the design system
* [x] Add floating header and bottom navigation
* [x] Configure Angular application structure
* [x] Configure Angular PWA support
* [x] Create the mobile application shell
* [x] Configure routing and lazy-loaded pages

### ~~Domain model~~

* [x] Define category model
* [x] Add creation and modification timestamps
* [x] Define repository interfaces independently from IndexedDB
* [x] Define transaction model
* [x] Use stable UUIDs for all persisted entities

### ~~State management~~

* [x] Configure NgRx Store
* [x] Configure NgRx Effects
* [x] Configure selectors
* [x] Define feature state boundaries
* [x] Keep persistence logic outside components

### ~~Local persistence~~

* [x] Configure IndexedDB with Dexie
* [x] Implement local repositories
* [x] Load persisted data when the application starts

### ~~Initial features~~

* [x] Dashboard
* [x] Category management
* [x] Basic monthly totals
* [x] Basic category breakdown
* [x] Transaction list
* [x] Add transaction
* [x] Edit transaction
* [x] Delete transaction

### ~~Quality baseline~~

* [x] Empty states
* [x] Error handling
* [x] Form validation

---

## v0.2 — Synchronization foundation

**Goal:** Implement remote synchronization and implement a first Google Sheet provider.

### Synchronization model

- [ ] Add sync metadata to persisted entities
- [ ] Add entity version numbers
- [ ] Add tombstones for deleted records
- [ ] Implement an outbox for pending local mutations
- [ ] Define remote gateway interfaces
- [ ] Implement synchronization cursors
- [ ] Define retry and backoff behaviour
- [ ] Define conflict detection rules
- [ ] Define conflict resolution strategy
- [ ] Implement a fake remote gateway for development and tests
- [ ] Add sync status indicators to the interface

### Synchronization behaviour

* [ ] Request persistent browser storage when supported
- [ ] Push local outbox operations
- [ ] Pull remote changes
- [ ] Apply remote changes to IndexedDB
- [ ] Make operations idempotent
- [ ] Compact redundant outbox operations
- [ ] Resume interrupted synchronization
- [ ] Keep the UI fully usable during synchronization
- [ ] Add manual sync controls
- [ ] Add sync logs for debugging

### QOL improvements
- [ ] Add one-time contextual onboarding for gesture-based interactions
- [ ] Demonstrate category swipe actions the first time they are available
- [ ] Persist dismissed onboarding hints locally
- [ ] End-to-end test for transaction CRUD

### Google authentication

- [ ] Configure Google Cloud project
- [ ] Configure OAuth consent screen
- [ ] Implement Google sign-in
- [ ] Request the minimum required scopes
- [ ] Handle expired sessions
- [ ] Handle revoked permissions
- [ ] Add disconnect-account flow

### Spreadsheet provisioning

- [ ] Search for an existing Lootrack spreadsheet
- [ ] Create a spreadsheet automatically when none exists
- [ ] Initialize required worksheets
- [ ] Initialize headers and schema metadata
- [ ] Store the spreadsheet ID locally
- [ ] Detect incompatible spreadsheet schemas
- [ ] Add spreadsheet schema migrations

### Google Sheets gateway

- [ ] Implement the Google Sheets remote gateway
- [ ] Upload local operations
- [ ] Download remote operations
- [ ] Use UUIDs instead of row numbers as identifiers
- [ ] Use batched reads and writes
- [ ] Prevent duplicate operation application
- [ ] Handle API quotas and transient failures
- [ ] Expose connection and sync diagnostics

### User settings

- [ ] Allow cloud sync to remain disabled
- [ ] Add “Connect Google Drive”
- [ ] Add “Sync now”
- [ ] Display last successful sync
- [ ] Display pending local changes
- [ ] Add remote reset and reconnect workflows
- [ ] Explain what is stored in Google Sheets
- [ ] Preserve local-only mode as a first-class option

### Reliability

- [ ] Test synchronization across phone and desktop
- [ ] Test concurrent edits
- [ ] Test offline edits on multiple clients
- [ ] Test deletion conflicts
- [ ] Test interrupted uploads and downloads
- [ ] Test restoring IndexedDB from Google Sheets
- [ ] Test restoring Google Sheets from a JSON backup

---

## v0.3 — Daily-driver features, testing and accessibility

**Goal:** Make Lootrack practical for continuous personal use. Define tests and make the app WADC compliant

### JSON backup and restore

- [ ] Export the complete local database as JSON
- [ ] Import and validate a JSON backup
- [ ] Detect incompatible backup versions
- [ ] Add explicit replace and merge restore modes
- [ ] Include schema and application version metadata
- [ ] Add automatic pre-import backup
- [ ] Add CSV export for human-readable transaction data

### UI improvements

- [ ] Search transactions
- [ ] Advanced filters
- [ ] Recurring transactions
- [ ] Budget limits by category
- [ ] Custom tags
- [ ] Transfer transactions between accounts
- [ ] Split transactions
- [ ] Custom date ranges
- [ ] Saved filters
- [ ] Improved dashboard customization
- [ ] Theme settings
- [ ] Dark mode
- [ ] Onboarding
- [ ] Import from CSV
- [ ] Improved accessibility
- [ ] Performance profiling and optimization

---

## v1.0 — Stable release

**Goal:** Provide a reliable, polished version suitable for everyday use.

- [ ] Complete core feature set
- [ ] Stable local database migrations
- [ ] Stable Google Sheets synchronization
- [ ] Reliable backup and restore
- [ ] Responsive mobile and desktop experience
- [ ] Comprehensive automated tests
- [ ] Accessibility review
- [ ] Performance review
- [ ] Security review
- [ ] User-facing documentation
- [ ] Recovery and troubleshooting documentation
- [ ] Production deployment
- [ ] Changelog and release process

---

## Future possibilities

These are intentionally outside the initial release scope.

### Native application

- Capacitor wrapper
- Native sharing
- Biometric lock
- Native notifications
- Receipt scanning
- Native iOS navigation shell
- Liquid Glass interface elements

### Alternative synchronization providers

- CloudKit
- Custom REST API
- Supabase
- OneDrive
- Dropbox

### Collaboration

- Shared budgets
- Household accounts
- Multiple users
- Permissions
- Shared categories and goals

### Extended financial features

- Savings goals
- Subscription tracking
- Forecasting
- Income planning
- Net-worth tracking
- Bank import integrations

---

## Out of scope for the first release

To keep development focused, the following should not block v1.0:

- Native App Store publication
- Multi-user collaboration
- Bank account integrations
- Receipt image storage
- Automatic financial advice
- Multiple remote synchronization providers
- A custom hosted backend
