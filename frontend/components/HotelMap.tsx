
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
  // The turn-by-turn routing module. Whether it is actually usable depends
  // on the account/key having a route service provisioned.
  Route: {
    add: (point: unknown) => void;
    search: () => void;
    clear?: () => void;
    placeholder?: (el: HTMLElement) => void;
  };
}

export default function HotelMap({
  name,
  latitude,
  longitude,
  className = "",
}: HotelMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_LONGDO_MAP_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const routeResultRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LongdoMapInstance | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const [routePending, setRoutePending] = useState(false);
  const [routeFailed, setRouteFailed] = useState(false);

  const routeEventBoundRef = useRef(false);
  const routeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.longdo) return;

    if (!mapRef.current) {
      mapRef.current = new window.longdo.Map({
        placeholder: containerRef.current,
      });
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

    const resizeTimer = setTimeout(() => map.resize(), 50);
    return () => clearTimeout(resizeTimer);
  }, [scriptReady, latitude, longitude, name]);

  // Draw a route from the guest's current location to the hotel.
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

    if (routeTimeoutRef.current) {
      clearTimeout(routeTimeoutRef.current);
    }

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

      map.Route.add(
        new window.longdo.Marker(
          { lon: longitude, lat: latitude },
          { title: name }
        )
      );

      map.Route.search();
    } catch {
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
        map.Overlays.add(
          new window.longdo.Marker(
            { lon: longitude, lat: latitude },
            { title: name, detail: name }
          )
        );
      }
    }

    if (routeResultRef.current) {
      routeResultRef.current.innerHTML = "";
    }

    setRouteDrawn(false);
    setRoutePending(false);
    setRouteFailed(false);
    setOrigin(null);
    setAddress("");
    setLocateError(null);
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
        const point = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };

        setOrigin(point);
        setAddress("My current location");
        setLocating(false);
        drawRouteOnMap(point);
      },
      () => {
        setLocating(false);
        setLocateError(
          "Couldn't access your location. Allow location access, or type your address below instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleAddressSubmit(e: FormEvent) {
    e.preventDefault();
    setOrigin(null);
    setLocateError(null);
  }

  const destination = `${latitude},${longitude}`;
  const originParam = origin
    ? `${origin.lat},${origin.lon}`
    : address.trim();

  const directionsHref = originParam
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${destination}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  if (!apiKey) {
    return (
      <div
        className={`flex aspect-video w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-card border border-dashed border-secondary bg-secondary/20 text-center ${className}`}
      >
        <p className="text-sm font-medium text-text">Map unavailable</p>
        <p className="max-w-xs text-xs text-muted">
          Set NEXT_PUBLIC_LONGDO_MAP_KEY in frontend/.env.local to show the map here.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 ${className}`}>
      <Script
        src={`https://api.longdo.com/map/?key=${apiKey}`}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      <div className="w-full min-w-0 overflow-hidden rounded-card border border-secondary/60">
        <div
          ref={containerRef}
          style={{ width: "100%", height: "260px" }}
        />
      </div>

      {/* Directions */}
      <div className="mt-3 w-full min-w-0 overflow-hidden rounded-card border border-secondary/60 bg-card p-4">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-dark">
          <Navigation className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Get directions</span>
        </p>

        {/* Keep the input and location button stacked at every screen size. */}
        <form
          onSubmit={handleAddressSubmit}
          className="mt-2 flex w-full min-w-0 flex-col gap-2"
        >
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setOrigin(null);
            }}
            placeholder="Enter your address"
            className="block w-full min-w-0 max-w-full box-border rounded-control border border-secondary/60 bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />

          <div className="flex w-full min-w-0 gap-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating || routePending}
              className="flex w-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-control border border-secondary/60 px-3 py-2 text-xs font-medium text-text hover:bg-secondary/30 disabled:opacity-50"
            >
              <Locate className="h-3.5 w-3.5 shrink-0" />

              <span className="min-w-0 break-words text-center leading-tight">
                {locating
                  ? "Locating..."
                  : routePending
                    ? "Finding route..."
                    : "Use my location"}
              </span>
            </button>

            {(origin || address.trim()) && (
              <button
                type="button"
                onClick={resetToHotelView}
                className="flex shrink-0 items-center justify-center rounded-control border border-secondary/60 px-2 py-2 text-text hover:bg-secondary/30"
                aria-label="Clear"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {locateError && (
          <p className="mt-2 break-words text-xs text-booked2">
            {locateError}
          </p>
        )}

        {routeFailed && (
          <p className="mt-2 break-words text-xs text-muted">
            Couldn&apos;t draw the route on the map above, but the button below still works.
          </p>
        )}

        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full min-w-0 max-w-full box-border items-start gap-1.5 overflow-hidden rounded-control bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-dark"
        >
          <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">
            Open directions to {name}
          </span>
        </a>

        {/* Turn-by-turn steps supplied by Longdo's Route module. */}
        <div
          ref={routeResultRef}
          className={routeDrawn ? "mt-3 min-w-0 break-words text-xs text-text" : "hidden"}
        />
      </div>
    </div>
  );
}
