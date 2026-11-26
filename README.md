# INSYNC Running Club website

The website for INSYNC Running Club, a Berkeley run club. Live at **[insyncrunning.com](https://insyncrunning.com)**.

Originally built by [tyakut](https://github.com/tyakut) ([tyakut/insync-website](https://github.com/tyakut/insync-website)). Now maintained and published by [Luka Perehinets](https://github.com/lperehinets).

It is a static site: plain HTML, CSS, and JavaScript with no build step, no package installation, and no external JavaScript dependencies. Open `index.html` or serve the folder with any static web server. GitHub Pages serves it at the custom domain in `CNAME`.

## Files

- `index.html`: club homepage, navigation menu, upcoming and past run schedule, routes, sign-up links, and FAQ
- `partners.html`: past collaborators and partner contact
- `styles.css`: all styles
- `main.js`: event tabs, menu behavior, and moving the featured event to the past list after its date
- `logo-jelly.js`: interactive 3D INSYNC logo in the hero
- `particle-text.js`: particle text animation for the club values
- `assets/`: logos, icons, event flyers, and `.ics` calendar files
- `404.html`: redirects to the homepage
- `publish.sh`: commits and pushes changes, then prints a cache-busting link

## Pages and interactions

- Interactive extruded INSYNC logo with glossy dark jelly shading, drag/toss physics, tap-to-squish, keyboard nudges, and reset. Reduced-motion users get direct manipulation without momentum. Rendering sleeps when settled or offscreen. The hero stays usable if WebGL is unavailable.
- Sticky chrome bead with particle text across the three club values. Scrolling moves the bead through points 01 to 03, then a short drop with an arrow points into the run schedule. Honors `prefers-reduced-motion` with static type.
- Desktop navigation spans the header. Compact screens keep the full dropdown menu.
- Event tabs support arrow keys, Home, and End. The menu closes on Escape and on outside clicks.
- After the featured event's date (midnight Pacific), `main.js` moves it to the past list, turns the RSVP into an event link, and hides the calendar download.
- Calendar downloads record the known start time only. No end time is invented.

## Content sources

Event details and flyers come from the club's own graphics. Archive entries and past collaborators came from earlier project materials and Instagram screenshots. Archive links point to the club's Instagram profile because individual post links were not supplied.

Flyers name the meeting point "Strada Fountain." Maps links use Caffe Strada as a nearby reference. Confirm the fountain name before adding a formal address.

No course map has been supplied. Routes describe the confirmed meeting point and link to the event. Partner inquiries open an email to lperehinets1@gmail.com. Event sign-up uses Partiful pages. There is no registration form or mailing-list backend.

## Updating events

When adding a new event:

1. Update the event content in `index.html`.
2. Add or update its calendar file in `assets/` (for example `assets/insync-october-30.ics`).
3. Update the archive cutoff date and the upcoming/past counts in `main.js`.

Keep dates and archive metadata aligned across all three. Assets are local and preserve the club's visual identity.

## Publishing

```
./publish.sh "short note about what changed"
```

The script pulls, commits, and pushes, then prints a `?v=<commit>` link that bypasses the browser cache.
