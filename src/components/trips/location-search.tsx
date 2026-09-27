"use client";

import { SearchBoxCore, SessionToken } from "@mapbox/search-js-core";
import type { SearchBoxFeatureSuggestion, SearchBoxSuggestion } from "@mapbox/search-js-core";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationSelection = {
  id: string;
  display: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
};

type LocationSearchProps = {
  label: string;
  addressName: string;
  locationNameName: string;
  latName: string;
  lngName: string;
  defaultAddress?: string | null;
  defaultLocationName?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  placeholder?: string;
};

function defaultSelection({
  defaultAddress,
  defaultLocationName,
  defaultLat,
  defaultLng,
}: Pick<LocationSearchProps, "defaultAddress" | "defaultLocationName" | "defaultLat" | "defaultLng">) {
  if (defaultLat == null || defaultLng == null) return null;

  const display = defaultAddress || defaultLocationName || "";
  if (!display) return null;

  return {
    id: `${defaultLat},${defaultLng},${display}`,
    display,
    name: defaultLocationName || display,
    address: defaultAddress || display,
    lat: String(defaultLat),
    lng: String(defaultLng),
  } satisfies LocationSelection;
}

function selectionFromSuggestion(suggestion: SearchBoxSuggestion) {
  const name =
    suggestion.name_preferred ||
    suggestion.name ||
    suggestion.full_address ||
    "Suggested location";
  const address =
    suggestion.full_address ||
    [suggestion.address, suggestion.place_formatted].filter(Boolean).join(", ") ||
    name;

  return {
    id: suggestion.mapbox_id,
    display: address,
    name,
    address,
    lat: "",
    lng: "",
  } satisfies LocationSelection;
}

function selectionFromFeature(feature: SearchBoxFeatureSuggestion) {
  const [longitude, latitude] = feature.geometry.coordinates;
  if (latitude == null || longitude == null) return null;

  const name =
    feature.properties.name_preferred ||
    feature.properties.name ||
    feature.properties.full_address ||
    "Selected location";
  const address = feature.properties.full_address || name;

  return {
    id: `${longitude},${latitude},${address}`,
    display: address,
    name,
    address,
    lat: String(latitude),
    lng: String(longitude),
  } satisfies LocationSelection;
}

export function LocationSearch({
  label,
  addressName,
  locationNameName,
  latName,
  lngName,
  defaultAddress,
  defaultLocationName,
  defaultLat,
  defaultLng,
  placeholder = "Search for a place or address",
}: LocationSearchProps) {
  const id = useId();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const selectingSuggestionRef = useRef<string | null>(null);
  const searchBoxRef = useRef<SearchBoxCore | null>(token ? new SearchBoxCore({ accessToken: token }) : null);
  const sessionTokenRef = useRef<SessionToken>(new SessionToken());
  const suggestionsRef = useRef<SearchBoxSuggestion[]>([]);
  const [selection, setSelection] = useState<LocationSelection | null>(() =>
    defaultSelection({ defaultAddress, defaultLocationName, defaultLat, defaultLng }),
  );
  const [query, setQuery] = useState(selection?.display ?? defaultAddress ?? defaultLocationName ?? "");
  const [results, setResults] = useState<LocationSelection[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    searchBoxRef.current = token ? new SearchBoxCore({ accessToken: token }) : null;
    sessionTokenRef.current = new SessionToken();
  }, [token]);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const trimmedQuery = query.trim();
    const isSelectedValue = selection?.display === query && Boolean(selection?.lat) && Boolean(selection?.lng);

    if (isSelectedValue) {
      return;
    }

    if (!token || !searchBoxRef.current || trimmedQuery.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setMessage(null);
      try {
        const response = await searchBoxRef.current!.suggest(trimmedQuery, {
          sessionToken: sessionTokenRef.current,
          limit: 5,
          types: "address,poi",
          language: "en",
          signal: controller.signal,
        });

        suggestionsRef.current = response.suggestions as SearchBoxSuggestion[];
        const nextResults = suggestionsRef.current.map((suggestion) => selectionFromSuggestion(suggestion));

        setResults(nextResults);
        setMessage(nextResults.length ? null : "No matching locations found.");
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setMessage("Location search is unavailable for this token.");
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selection, token]);

  async function selectResult(result: LocationSelection) {
    if (selectingSuggestionRef.current) return;

    const suggestion = suggestionsRef.current.find((item) => item.mapbox_id === result.id);
    if (!suggestion || !searchBoxRef.current) return;

    selectingSuggestionRef.current = result.id;
    setLoading(true);
    try {
      const response = await searchBoxRef.current.retrieve(suggestion, {
        sessionToken: sessionTokenRef.current,
        language: "en",
      });
      const nextSelection = selectionFromFeature(response.features[0] as SearchBoxFeatureSuggestion);
      if (!nextSelection) return;
      setQuery(nextSelection.display);
      setSelection(nextSelection);
      suggestionsRef.current = [];
      setOpen(false);
      setResults([]);
      setMessage(null);
      inputRef.current?.blur();
    } catch {
      setMessage("Location details could not be loaded.");
      setOpen(true);
    } finally {
      selectingSuggestionRef.current = null;
      setLoading(false);
    }
  }

  return (
    <div className="relative grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setSelection((current) => (current?.display === nextQuery ? current : null));
            if (nextQuery.trim().length < 3) {
              setResults([]);
              setLoading(false);
              setMessage(null);
              setOpen(false);
            }
            if (nextQuery.trim().length >= 3) setOpen(true);
          }}
          onFocus={() => {
            if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
            const isSelectedValue = selection?.display === query;
            setOpen((results.length > 0 || Boolean(message)) && !isSelectedValue);
          }}
          onBlur={() => {
            blurTimeoutRef.current = window.setTimeout(() => setOpen(false), 120);
          }}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <input type="hidden" name={locationNameName} value={selection?.name ?? ""} />
      <input type="hidden" name={addressName} value={selection?.address ?? ""} />
      <input type="hidden" name={latName} value={selection?.lat ?? ""} />
      <input type="hidden" name={lngName} value={selection?.lng ?? ""} />

      {open && (results.length > 0 || message) ? (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              className="flex w-full gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onPointerDown={(event) => {
                event.preventDefault();
                void selectResult(result);
              }}
              onClick={() => void selectResult(result)}
            >
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{result.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{result.address}</span>
              </span>
            </button>
          ))}
          {results.length === 0 && message ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{message}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
