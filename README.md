# Pathfinder Web Prototype — V4

## What changed in V4
- Added official YAC image assets by their original public URLs:
  - Lama-Lama-Map-2014-1.jpg
  - Visiting-banner.png
  - Visiting-banner-3-Photo-Annette-Ruzicka.png
- Added a clearly labelled Pathfinder Proposed Overdue / Emergency Workflow.
- Live route status and live hazard feed are now labelled Future Development.
- Satellite communicator remains a Pathfinder Proposed Design, not a current YAC service.
- Official route-level visitor map remains No public resource found.
- No fake official emergency SOP is claimed.

## Important limitation
The official images are currently referenced from the YAC website. This keeps their original source clear, but does not guarantee full offline availability.
A local approved copy of the map/image files would still be needed for a fully self-contained offline demonstration.

## Proposed overdue workflow
1. Expected return reached.
2. Dashboard flags trip for Ranger review.
3. Ranger reviews trip information.
4. Ranger attempts approved available contact.
5. If unresolved, Ranger follows an approved emergency procedure once defined.

Pathfinder does not automate search-and-rescue decisions.

## Run
python -m http.server 8000
Then open http://localhost:8000


## V5 map update
- The uploaded official Lama Lama Country map is now bundled locally at:
  `assets/Lama-Lama-Map-2014-1.jpg`
- The map can therefore be cached for offline display.
- A visible note explains that this map is reference-only and is not detailed enough for Pathfinder route planning or Ranger operations.
- A more detailed, community-approved visitor/route map remains a required future resource.


## V6 Ranger overdue-response workflow
V6 adds an interactive Pathfinder-proposed Ranger response review.

For Due Soon / Overdue prototype trips, Rangers can:
1. Open a response review panel.
2. Review recorded trip information.
3. Record an attempted contact.
4. Confirm that the trip remains unresolved.
5. Hand off to a Ranger/YAC-approved emergency procedure.

Important:
- Pathfinder does not define or pretend to know the official emergency SOP.
- Pathfinder does not automatically initiate search and rescue.
- Any grace period or due-soon threshold remains a configurable prototype setting requiring YAC/Ranger approval.
- Live route status and live hazard feeds remain Future Development.


## V7
- Automatic prototype Due Soon / Overdue recalculation using current device time
- Configurable prototype thresholds
- Local audit log
- Role selector: Visitor / Ranger / Cultural Approver / YAC Administrator
- Role-permission preview
- Required-before-deployment checklist


## V8 — Simple Mode / Advanced Mode
Pathfinder now opens in a safety-first Simple Mode for visitors.

### Simple Mode
- Emergency — largest and most prominent action
- Map
- My Trip
- Safety Info
- Check In / Out
- Advanced Mode link

### Design rationale
The simplified default interface reduces cognitive load and interaction steps in stressful situations.
Administrative, governance, audit, prototype-development and detailed planning functions remain available in Advanced Mode.

### Emergency design limits
- Pathfinder can display locally available safety information and request device location.
- A normal browser cannot transmit an off-grid SOS without a communications network.
- Satellite communicator integration remains a proposed feature.
- Official Ranger/YAC emergency SOP remains unavailable in the public sources reviewed.

### Important
Simple Mode does not remove any existing Advanced Mode features.


## V8 Fixed — navigation reliability
- localStorage failures no longer stop JavaScript initialization.
- Simple Mode uses page-like URL hashes:
  - #home
  - #emergency
  - #map
  - #trip
  - #safety
  - #check
- Browser Back / Forward works between Simple Mode panels.
- This remains a single-page web app; the content changes without loading separate HTML files.


## V8.1 button/navigation fix
Root cause found:
- `renderTrips()` called a missing `updateMetrics()` function during page startup.
- That JavaScript exception stopped DOMContentLoaded before the Simple Mode buttons were bound.

Fixes:
- Restored a safe `updateMetrics()` function.
- Simple Mode safety buttons are now bound before Advanced Mode initialization.
- Simple Mode listeners use defensive optional element access.
- Ranger table headers now match the generated rows.

The site can be opened directly from `index.html` for normal Simple Mode navigation.
For service-worker/PWA offline testing, use `python -m http.server 8000`.


## V9 — Safety UX, offline readiness and Ranger security

### Simple Mode
- Emergency remains the highest-priority action.
- All Simple Mode subpages now have a persistent Emergency shortcut.
- Emergency view is shortened to primary actions first.
- GPS view includes accuracy and Copy Location.
- Map and Safety Info show cache/refresh freshness information.
- Check-out now requires a confirmation step.
- My Trip directs users to create a trip when none exists.

### Offline caching
The design now follows the intended first-use model:
1. User opens Pathfinder online through HTTP/HTTPS.
2. The service worker installs and pre-caches core local assets.
3. The interface records Offline Ready status.
4. Core Simple Mode assets can then be used without network access.

Important: service workers do not operate from normal `file://` double-click pages.
For presentation, run:
`python -m http.server 8000`
and open:
`http://localhost:8000`

### Visitor and Ranger workspaces
Advanced Mode now presents separate Visitor and Ranger workspaces.

### Ranger prototype security
- Ranger workspace is locked by default.
- Demo passcode: `1234`
- Verification uses SHA-256 through the browser Web Crypto API.
- Unlock state is stored only in sessionStorage.
- Ranger can manually lock the workspace.

This is presentation-grade prototype security only.
Real deployment would require:
- HTTPS
- server-side authentication
- unique user accounts
- strong password policy / MFA where appropriate
- role-based access control
- secure server-side audit logs
- approved privacy and retention rules

### Presentation demo
The Ranger workspace has a Start Demo control which creates three clearly labelled fictional trips:
- On Country
- Due Soon
- Overdue


## V9 English-only cleanup
All Chinese placeholder text has been replaced with English equivalents.
Typical labels now use:
- No public resource found
- Not available
- Unavailable (device permission required)
