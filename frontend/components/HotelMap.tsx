"use client";

import Script from "next/script";
import { Navigation, Locate, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

interface HotelMapProps {
  name: string;
  latitude: number;
  longitude: number;
  className?: string;
}

// Minimal shape of the global `longdo` object we actually use, so we don't
// need `any` sprinkled everywhere. The real Longdo Map JS API is much larger.
declare global {
  interface Window {
    longdo?: {
      Map: new (opts: { placeholder: HTMLElement; language?: string }) => LongdoMapInstance;
      Marker: new (
        location: { lon: number; lat: number },
        opts?: { title?: string; detail?: string; icon?: Record<string, unknown> }
      ) => unknown;
    };
  }
}

interface LongdoMapInstance {
  location: (loc: { lon: number; lat: number }, animate?: boolean) => void;
  zoom: (level: number, animate?: boolean) => void;
  Overlays: { add: (overlay: unknown) => void; clear: () => void };
  resize: () => void;
  Event: { bind: (name: string, handler: () => void) => void };
  // The turn-by-turn routing module. Whether it's actually usable depends
  // on the account/key having a route service provisioned - search() is
  // fire-and-forget (it reports success via the "guideComplete" event, not
  // a return value or a thrown error), so a missing/failed route must be
  // detected via that event (or its absence), never assumed from search()
  // merely not throwing.
  Route: {
    add: (point: unknown) => void;
    search: () => void;
    clear?: () => void;
    placeholder?: (el: HTMLElement) => void;
  };
}

export default function HotelMap({ name, latitude, longitude, className = "" }: HotelMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_LONGDO_MAP_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const routeResultRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LongdoMapInstance | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  // Coordinates for the guest's starting point, once known precisely (from
  // "Use my location") - lets us draw the route on the embedded map itself,
  // not just hand off to an external maps app.
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const [routePending, setRoutePending] = useState(false);
  const [routeFailed, setRouteFailed] = useState(false);
  // "guideComplete" only needs binding once per map instance - not once per
  // route attempt - otherwise every retry stacks another duplicate handler.
  const routeEventBoundRef = useRef(false);
  // Tracks the pending give-up timer so a stale one from an abandoned
  // attempt (e.g. user clicks "Use my location", then "Clear", then "Use my
  // location" again before the first attempt's 8s is up) can never fire
  // after the fact and mark the newer, still-legitimately-in-flight attempt
  // as failed.
  const routeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Belt-and-suspenders: if the component unmounts (e.g. the person
  // navigates away) while a route search is still pending, cancel the
  // give-up timer so it can't call setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.longdo) return;

    // Only create the map instance once per mount; on prop changes just
    // re-center it instead of re-creating the whole map.
    if (!mapRef.current) {
      mapRef.current = new window.longdo.Map({ placeholder: containerRef.current });
    }
    const map = mapRef.current;

    map.Overlays.clear();
    map.location({ lon: longitude, lat: latitude }, true);
    map.zoom(15, true);
    map.Overlays.add(
      new window.longdo.Marker(
        { lon: longitude, lat: latitude },
        { title: name, detail: name }
      )
    );

    // Longdo sizes its canvas from the placeholder's dimensions at creation
    // time, so nudge it to fill the container correctly after layout settles.
    const resizeTimer = setTimeout(() => map.resize(), 50);
    return () => clearTimeout(resizeTimer);
  }, [scriptReady, latitude, longitude, name]);

  // Best-effort: draws the route from the guest's location to the hotel on
  // the embedded map itself, with turn-by-turn steps in routeResultRef.
  // Only possible once we have precise coordinates for the guest's side
  // (from geolocation) - a freeform typed address is handled by the
  // "Open in Google Maps" link instead, which can geocode text on its own.
  //
  // map.Route.search() is fire-and-forget: it does NOT throw or return
  // anything meaningful on failure, and only reports success later via the
  // "guideComplete" event - so this function must not assume success (or
  // touch the hotel's own marker) until that event actually fires. If the
  // account/key has no route service provisioned, or no route is found,
  // guideComplete simply never fires; the timeout below is what notices
  // that and gives up gracefully instead of leaving the UI stuck "loading"
  // forever with no explanation.
  function drawRouteOnMap(guestLocation: { lat: number; lon: number }) {
    const map = mapRef.current;
    if (!map || !window.longdo || typeof map.Route?.add !== "function") {
      setRouteFailed(true);
      return;
    }

    setRoutePending(true);
    setRouteFailed(false);
    setRouteDrawn(false);

    if (!routeEventBoundRef.current) {
      map.Event.bind("guideComplete", () => {
        if (routeTimeoutRef.current) {
          clearTimeout(routeTimeoutRef.current);
          routeTimeoutRef.current = null;
        }
        setRoutePending(false);
        setRouteDrawn(true);
      });
      routeEventBoundRef.current = true;
    }

    // Cancel any earlier attempt's still-pending give-up timer before
    // starting a new one, so it can never fire after the fact and stomp on
    // this newer attempt's own state.
    if (routeTimeoutRef.current) {
      clearTimeout(routeTimeoutRef.current);
    }

    // Give up after a few seconds rather than leaving the "Locating..."
    // state stuck forever if guideComplete never fires. The hotel's own
    // marker is left untouched throughout (see the base map effect above),
    // so there's nothing to restore even if this times out.
    routeTimeoutRef.current = setTimeout(() => {
      routeTimeoutRef.current = null;
      setRoutePending((stillPending) => {
        if (stillPending) setRouteFailed(true);
        return false;
      });
    }, 8000);

    try {
      map.Route.clear?.();
      if (routeResultRef.current) {
        map.Route.placeholder?.(routeResultRef.current);
      }
      map.Route.add(
        new window.longdo.Marker(
          { lon: guestLocation.lon, lat: guestLocation.lat },
          { title: "Your location" }
        )
      );
      map.Route.add(new window.longdo.Marker({ lon: longitude, lat: latitude }, { title: name }));
      map.Route.search();
    } catch {
      // A synchronous failure (rare, but possible if the API shape differs
      // from what's expected here) - the "Open in Google Maps" button below
      // still works regardless.
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
        routeTimeoutRef.current = null;
      }
      setRoutePending(false);
      setRouteFailed(true);
    }
  }

  function resetToHotelView() {
    if (routeTimeoutRef.current) {
      clearTimeout(routeTimeoutRef.current);
      routeTimeoutRef.current = null;
    }
    const map = mapRef.current;
    if (map) {
      map.Route?.clear?.();
      map.Overlays.clear();
      map.location({ lon: longitude, lat: latitude }, true);
      map.zoom(15, true);
      if (window.longdo) {
        map.Overlays.add(new window.longdo.Marker({ lon: longitude, lat: latitude }, { title: name, detail: name }));
      }
    }
    if (routeResultRef.current) routeResultRef.current.innerHTML = "";
    setRouteDrawn(false);
    setRoutePending(false);
    setRouteFailed(false);
    setOrigin(null);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("Location access isn't supported by this browser.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setOrigin(point);
        setAddress("My current location");
        setLocating(false);
        drawRouteOnMap(point);
      },
      () => {
        setLocating(false);
        setLocateError("Couldn't access your location. Allow location access, or type your address below instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleAddressSubmit(e: FormEvent) {
    e.preventDefault();
    // We don't geocode the typed text ourselves - "Open in Google Maps"
    // below hands the raw address off to Google, which resolves it
    // reliably without an extra API dependency here.
    setOrigin(null);
    setLocateError(null);
  }

  // The hotel's own coordinates are always the destination - this is what
  // makes the link/route point at the right building rather than just a
  // city or street name.
  const destination = `${latitude},${longitude}`;
  const originParam = origin ? `${origin.lat},${origin.lon}` : address.trim();
  const directionsHref = originParam
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${destination}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  if (!apiKey) {
    return (
      <div
        className={`flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-card border border-dashed border-secondary bg-secondary/20 text-center ${className}`}
      >
        <p className="text-sm font-medium text-text">Map unavailable</p>
        <p className="max-w-xs text-xs text-muted">
          Set NEXT_PUBLIC_LONGDO_MAP_KEY in frontend/.env.local to show the map here.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Script
        src={`https://api.longdo.com/map/?key=${apiKey}`}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div className="overflow-hidden rounded-card border border-secondary/60">
        <div ref={containerRef} style={{ width: "100%", height: "260px" }} />
      </div>

      {/* Directions: get from the guest's own location/address to the hotel. */}
      <div className="mt-3 rounded-card border border-secondary/60 bg-card p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-dark">
          <Navigation className="h-3.5 w-3.5 text-primary" /> Get directions
        </p>

        <form onSubmit={handleAddressSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setOrigin(null);
            }}
            placeholder="Enter your address"
            className="flex-1 rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating || routePending}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-control border border-secondary/60 px-3 py-2 text-xs font-medium text-text hover:bg-secondary/30 disabled:opacity-50"
            >
              <Locate className="h-3.5 w-3.5" />{" "}
              {locating ? "Locating..." : routePending ? "Finding route..." : "Use my location"}
            </button>
            {(origin || address.trim()) && (
              <button
                type="button"
                onClick={resetToHotelView}
                className="flex items-center justify-center rounded-control border border-secondary/60 px-2 py-2 text-text hover:bg-secondary/30"
                aria-label="Clear"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {locateError && <p className="mt-2 text-xs text-booked2">{locateError}</p>}
        {routeFailed && (
          <p className="mt-2 text-xs text-muted">
            Couldn't draw the route on the map above, but the button below still works.
          </p>
        )}

        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-dark"
        >
          <Navigation className="h-3.5 w-3.5" /> Open directions to {name}
        </a>

        {/* Turn-by-turn steps, injected directly by Longdo's Route module
            once it actually confirms a route was found (the "guideComplete"
            event in drawRouteOnMap) - never shown on the strength of merely
            having called search(), which reports nothing synchronously. */}
        <div ref={routeResultRef} className={routeDrawn ? "mt-3 text-xs text-text" : "hidden"} />
      </div>
    </div>
  );
}

