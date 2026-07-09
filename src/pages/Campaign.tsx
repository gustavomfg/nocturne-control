import { useMemo } from "react";

import { useNocturne } from "../state/useNocturne";
import { InterfaceIcon } from "../components/InterfaceIcon";
import "../styles/campaign.css";

export function Campaign() {
  const { campaign, missions, missionPlans, achievements, logs, advanceCampaign } = useNocturne();
  const openMissions = missions.filter((mission) => mission.status !== "COMPLETED");
  const replay = useMemo(() => logs.filter((log) => ["PLAN", "CAMPAIGN", "MISSION", "CAPTURE", "DEPLOY"].includes(log.type)).slice(0, 8), [logs]);

  return (
    <main className="campaign-page">
      <header className="campaign-header">
        <div>
          <h1>Night Watch</h1>
          <p>Plan operations, advance the clock and read the consequences across Nocturne City.</p>
        </div>
        <button className="campaign-advance" onClick={advanceCampaign}><InterfaceIcon name="radar" />Advance watch <span>›</span></button>
      </header>
      <section className="campaign-metrics" aria-label="Campaign status">
        <article><InterfaceIcon name="radar" /><span>Night</span><strong>{campaign.night}</strong><p>Turn {campaign.turn} of 3</p></article>
        <article><InterfaceIcon name="shield" /><span>City stability</span><strong>{campaign.cityStability}%</strong><p>{openMissions.length} open operations</p></article>
        <article><InterfaceIcon name="activity" /><span>Intelligence</span><strong>{campaign.intel}%</strong><p>{missionPlans.length} plans committed</p></article>
      </section>
      <section className="campaign-grid">
        <article className="campaign-panel">
          <h2>Prepared operations</h2>
          {missionPlans.length ? missionPlans.map((plan) => {
            const mission = missions.find((item) => item.id === plan.missionId);
            return <p key={plan.missionId}><strong>{mission?.title}</strong><br />{plan.strategy} / {plan.unit}</p>;
          }) : <p>No plan is committed. Planned operations gain progress and reduce risk when the watch advances.</p>}
        </article>
        <article className="campaign-panel">
          <h2>Unlocked archive</h2>
          {achievements.length ? achievements.map((achievement) => <p key={achievement.id}><strong>{achievement.title}</strong><br />{achievement.description}</p>) : <p>Complete operations, capture targets and commit plans to unlock field records.</p>}
        </article>
        <article className="campaign-panel replay-panel">
          <h2>Operational replay</h2>
          {replay.length ? replay.map((log) => <p key={log.id}><span>{log.timestamp} / {log.type}</span>{log.message}</p>) : <p>The replay will record your first field action.</p>}
        </article>
      </section>
    </main>
  );
}
