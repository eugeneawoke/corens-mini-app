import { Panel, Section } from "@corens/ui";

export function PeerBioSection({ about }: { about: string | null }) {
  const peerAbout = about?.trim();

  if (!peerAbout) {
    return null;
  }

  return (
    <Section title="О себе">
      <Panel>
        <p className="corens-copy corens-copy-muted">{peerAbout}</p>
      </Panel>
    </Section>
  );
}
