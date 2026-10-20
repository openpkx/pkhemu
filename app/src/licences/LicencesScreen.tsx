import { ExternalLink } from "@/components/ExternalLink";
import { ScreenHeader } from "@/plugin-kit/ScreenHeader";
import { TitledCard } from "@/plugin-kit/TitledCard";
import { appNotice, demoNotice, notices, type Notice } from "./notices";

function NoticeList({ title, list }: { title: string; list: Notice[] }) {
  return (
    <TitledCard title={title} className="max-w-2xl">
      <ul className="grid gap-1 text-sm">
        {list.map(({ name, version, licence, source }) => (
          <li key={`${name}@${version}`} className="flex flex-wrap justify-between gap-x-3">
            <ExternalLink href={source}>{version ? `${name} ${version}` : name}</ExternalLink>
            <span className="text-muted-foreground">{licence}</span>
          </li>
        ))}
      </ul>
    </TitledCard>
  );
}

export function LicencesScreen({ onBack }: { onBack(): void }) {
  return (
    <div className="min-h-screen pb-safe">
      <ScreenHeader title="Licences" onBack={onBack} />
      <main className="grid justify-items-center gap-4 p-4">
        <TitledCard title={appNotice.name} className="max-w-2xl">
          <p className="text-muted-foreground">
            {appNotice.name} is free software under the {appNotice.licence} licence.
          </p>
          <div className="flex gap-4 text-sm">
            <ExternalLink href={appNotice.source}>Source code</ExternalLink>
            <ExternalLink href={appNotice.licenceText}>Licence text</ExternalLink>
          </div>
        </TitledCard>
        <NoticeList title="Emulator cores" list={notices.core} />
        <NoticeList title="Demo game" list={[demoNotice]} />
        <NoticeList title="Save editor" list={notices.engine} />
        <NoticeList title="Rust crates" list={notices.rust} />
        <NoticeList title="npm packages" list={notices.npm} />
      </main>
    </div>
  );
}
