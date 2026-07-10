# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-10

First public release.

### Added

- Map-based verdict for overnight street parking anywhere in Milwaukee: pick a
  spot with GPS, an address search, or by dragging the map, and get the side of
  the street to park on tonight.
- Rule engine covering standard alternate-side (odd/even) parking, exception
  streets, through-highway and bus-route restrictions (Dec 1–Mar 1), and snow
  emergencies, evaluated in Central Time.
- Snow-emergency handling in three layers: an hourly winter scrape of the DPW
  status page, a staleness fallback, and an independent National Weather Service
  advisory.
- Collapsible verdict card, a menu of official City of Milwaukee resources, and
  an About dialog with credits.
- Progressive Web App: installable to a phone home screen with offline app-shell
  caching.

### Data sources

- City of Milwaukee open data (CC-BY) — street centerlines and parking-regulation
  map layers.
- OpenStreetMap contributors — base map tiles and address search (Nominatim).
- National Weather Service — winter storm alerts.

[1.0.0]: https://github.com/colinwright/milwaukee-parking/releases/tag/v1.0.0
