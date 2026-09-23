"use client";

import { useEffect, useRef, useState } from "react";

/**
 * An address that fills itself in.
 *
 * Start typing the street and pick the match; street, city, state, ZIP and
 * county fill in, and only the apartment or unit is left to type. The
 * suggestions come from Google Places (the new Autocomplete Data API, loaded
 * on first focus so a visitor who never touches the field never pays for the
 * script). Without a Google key the field is a plain street input, and typing
 * a ZIP fills city and state from a free lookup — weaker, but never broken.
 *
 * Restricted to US addresses: that is where the car is registered, and the
 * county that comes back is a tax input in Florida.
 */
export interface AddressParts {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  county: string;
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

let loader: Promise<any> | null = null;
function loadPlaces(): Promise<any> {
  if (!GOOGLE_KEY) return Promise.reject(new Error("no key"));
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) return resolve(window.google.maps.places);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&libraries=places&v=weekly&loading=async`;
    s.async = true;
    s.onload = async () => {
      try {
        const places = await window.google.maps.importLibrary("places");
        resolve(places);
      } catch (e) {
        reject(e);
      }
    };
    s.onerror = () => reject(new Error("places failed to load"));
    document.head.appendChild(s);
  });
  return loader;
}

function partsFromComponents(components: any[]): AddressParts {
  const get = (type: string, short = false) => {
    const c = components.find((x) => (x.types as string[]).includes(type));
    return c ? (short ? c.shortText : c.longText) ?? "" : "";
  };
  const number = get("street_number");
  const route = get("route");
  return {
    line1: [number, route].filter(Boolean).join(" "),
    city: get("locality") || get("sublocality_level_1") || get("postal_town") || get("neighborhood"),
    state: get("administrative_area_level_1", true),
    postalCode: get("postal_code"),
    county: get("administrative_area_level_2"),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function AddressField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onResolve,
  inputClass,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (line1: string) => void;
  /** The full address, once the member has picked a suggestion. */
  onResolve: (parts: AddressParts) => void;
  inputClass: string;
}) {
  const [suggestions, setSuggestions] = useState<Array<{ text: string; pick: () => Promise<void> }>>([]);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(GOOGLE_KEY ? null : false);
  const session = useRef<unknown>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function ensure() {
    if (available === false) return null;
    try {
      const places = await loadPlaces();
      setAvailable(true);
      return places;
    } catch {
      setAvailable(false);
      return null;
    }
  }

  function query(text: string) {
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const places = await ensure();
      if (!places) return;
      try {
        session.current ??= new places.AutocompleteSessionToken();
        const { suggestions: found } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          includedRegionCodes: ["us"],
          includedPrimaryTypes: ["street_address", "premise", "subpremise"],
          sessionToken: session.current,
        });
        setSuggestions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          found.map((s: any) => ({
            text: s.placePrediction.text.toString(),
            pick: async () => {
              const place = s.placePrediction.toPlace();
              await place.fetchFields({ fields: ["addressComponents"] });
              session.current = null;
              const parts = partsFromComponents(place.addressComponents ?? []);
              onResolve(parts);
              setSuggestions([]);
              setOpen(false);
            },
          }))
        );
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 220);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete={available ? "off" : "address-line1"}
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          void ensure();
          if (suggestions.length) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          onChange(e.target.value);
          query(e.target.value);
        }}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        className={inputClass}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto border border-rule-strong bg-paper shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={s.text} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void s.pick()}
                className="block w-full px-3 py-2 text-left font-serif text-[0.9375rem] leading-snug text-ink hover:bg-paper-sunken"
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** City and state for a US ZIP, or null. Free, keyless, used when Places is not available. */
export async function lookupZip(zip: string): Promise<{ city: string; state: string } | null> {
  if (!/^\d{5}$/.test(zip)) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: Array<{ "place name": string; "state abbreviation": string }> };
    const p = data.places?.[0];
    return p ? { city: p["place name"], state: p["state abbreviation"] } : null;
  } catch {
    return null;
  }
}
