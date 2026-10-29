import {navigateRoute} from "../useRoute";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories } from "../../../../packages/core/repositories";
import { LocalAssistant } from "./LocalAssistant";
import { demo, rpc, storeFor } from "./client";
import type { Context } from "../context";
import { Button } from "../../../../packages/ui/components";

/** Load authorized context before local command review; never send command text. */
export function HomeAssistant({
  context: c,
  go,
}: {
  context: Context;
  go: (route: string) => void;
}) {
  const cache = useQueryClient();
  const ready = useQuery({
    queryKey: ["assistant-home-ready", c.account, c.cong],
    enabled: c.roles.includes("admin"),
    staleTime: 60000,
    queryFn: async () => {
      if (demo) {
        cache.setQueryData(["assistant-meeting", c.account, c.cong], {
          date: new Date().toISOString().slice(0, 10),
          kind: "midweek",
          canSubmit: true,
          count: null,
          timezone: "UTC",
        });
        return true;
      }
      const repo = repositories(storeFor(c.cong, c.roles), c.cong),
        year = new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0);
      const [people, current, previous, meeting, schedule] = await Promise.all([
        rpc("ca_v2_people", {p_cong_id:c.cong}),
        repo.reports.year(year),
        repo.reports.year(year - 1),
        rpc("ca_v3_meeting_context", { p_cong_id: c.cong }),
        repo.schedules.get(),
      ]);
      cache.setQueryData(["assistant-schedule", c.account, c.cong], schedule);
      cache.setQueryData(["assistant-people", c.account, c.cong], people);
      cache.setQueryData(
        ["assistant-records", c.account, c.cong],
        [...current, ...previous],
      );
      cache.setQueryData(["assistant-meeting", c.account, c.cong], meeting);
      return true;
    },
  });
  if (!c.roles.includes("admin")) return null;
  return (
    <section className="home-assistant stack" aria-label={t("assistant.adminLabel")}>
      <h2 className="sr-only">{t("assistant.adminTitle")}</h2>
      {ready.isPending ? (
        <p role="status">{t("assistant.loadingContext")}</p>
      ) : ready.error ? (
        <p role="alert">
          {t("assistant.contextError")}{" "}
          <Button onClick={() => void ready.refetch()} type="button">
            {t("search.retry")}
          </Button>
        </p>
      ) : (
        <LocalAssistant
          compact
          context={c}
          onExport={() => {
            navigateRoute({screen:"pdf",doc:"s21",action:"export"});
          }}
        />
      )}
    </section>
  );
}
