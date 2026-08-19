import { Link } from "react-router";
import { Icon } from "~/components/ui/Icon";
import type { Platform, Visibility } from "@shared/types/models";
import s from "./RepoRow.module.css";

const PLATFORM_ICONS: Record<Platform, "github" | "gitlab"> = {
  github: "github",
  gitlab: "gitlab",
};

interface RepoRowProps {
  fullName: string;
  platform: Platform;
  visibility: Visibility;
  fileCount: number;
  description?: string | null;
}

export function RepoRow({ fullName, platform, visibility, fileCount, description }: RepoRowProps) {
  return (
    <li className={`card ${s.row}`}>
      <Icon id={PLATFORM_ICONS[platform] ?? "repo"} size={16} className={s.repoIcon} />
      <div className={s.rowMain}>
        <Link to={`/repos/${fullName}`} className={s.repoName}>
          {fullName}
        </Link>
        <div className={s.meta}>
          <span className={`${s.badge} ${visibility === "private" ? s.badgePrivate : s.badgePublic}`}>
            <Icon id={visibility === "private" ? "lock" : "globe"} size={10} />
            {visibility}
          </span>
          <span className={s.fileCount}>
            <Icon id="file" size={11} />
            {fileCount.toLocaleString()} files
          </span>
        </div>
        {description && <p className={s.description}>{description}</p>}
      </div>
    </li>
  );
}
