# INSYNC Running Club

A lightweight, responsive club website. Open `index.html` or serve the folder with any static web server. No build process, package installation, or external JavaScript dependencies.

## Pages and interactions

- Interactive extruded INSYNC logo with glossy dark jelly shading, drag/toss physics, tap-to-squish, keyboard nudges, and reset. Reduced-motion users get direct manipulation without momentum. Rendering sleeps when settled or offscreen; the hero stays usable if WebGL is unavailable.
- Sticky chrome bead with Atlas-style particle text across the three club values: scroll moves the bead gradually through points 01→03, then a short drop with ↓ points into the run schedule. Honors `prefers-reduced-motion` with static type.
- Desktop navigation spans the header; compact screens retain the full dropdown menu.
- Club homepage, full navigation menu, upcoming/past schedule, routes section, sign-up links, FAQ, and `partners.html`.
- Event tabs support arrow keys, Home, and End; menu closes on Escape and outside clicks.
- September 27 moves to the past list after midnight Pacific on September 28. The RSVP becomes an event link and calendar download is hidden.
- Calendar download records the known start time; no end time has been invented.

## Content sources and updates

September 27 event details and flyer came from the supplied INSYNC × ISAB graphic. September 18, September 4, May 9, May 3, and April 25 archive entries, and past collaborators, came from earlier project materials and Instagram screenshots. Archive links point to the club profile because individual post links were not supplied.

The flyer names the meeting point “Strada Fountain.” Maps links locate Caffe Strada as a nearby reference. Confirm the fountain name before adding a formal address.

No course map was supplied. Routes describe the confirmed meeting point and link to the event. Partner inquiries open an email to lperehinets1@gmail.com. Event signup uses the Partiful page; there is no pretend registration form or mailing-list backend.

Update event content in `index.html`, calendar data in `assets/insync-september-27.ics`, and archive cutoff/counts in `main.js` when adding future events. Keep dates and archive metadata aligned. Assets are local and preserve the supplied club identity.
