"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/styles/ui";
import type { Season } from "@/lib/types";

export function SeasonSelect({ seasons, value, path }: { seasons: Season[]; value: string; path: string }) {
  const router = useRouter();
  return (
    <Select aria-label="Temporada" value={value} onChange={(event) => router.push(`${path}?temporada=${event.target.value}`)}>
      {seasons.map((season) => (
        <option key={season.id} value={season.code}>
          {season.name}
          {season.isCurrent ? " · atual" : ""}
        </option>
      ))}
    </Select>
  );
}
