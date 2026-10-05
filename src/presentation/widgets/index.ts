import type { AwakenConfig, Player, ThemeMode, WidgetId } from '../../domain/types.js';
import { toSvg } from '../svg/document.js';
import type { Ctx, Rendered } from '../svg/kit.js';
import { resolveTheme } from '../theme/themes.js';
import { ariseWidget, dailyWidget, raidWidget } from './activity.js';
import { achievementsWidget, combatWidget, contributionWidget, hoursWidget, questWidget, skillsWidget } from './details.js';
import { hunterCard, statRune, statusWindow } from './profile.js';

export interface WidgetFile {
  /** File stem without the theme suffix, e.g. "status" or "rune-str". */
  name: string;
  widget: WidgetId;
  svg: string;
  width: number;
}

const render = (id: WidgetId, ctx: Ctx, p: Player, config: AwakenConfig): { name: string; rendered: Rendered }[] => {
  switch (id) {
    case 'hunter': return [{ name: 'hunter', rendered: hunterCard(ctx, p) }];
    case 'status': return [{ name: 'status', rendered: statusWindow(ctx, p) }];
    case 'runes': return p.stats.map((s) => ({ name: `rune-${s.code.toLowerCase()}`, rendered: statRune(ctx, p, s) }));
    case 'quest': return [{ name: 'quest', rendered: questWidget(ctx, p, config.timezone) }];
    case 'skills': return [{ name: 'skills', rendered: skillsWidget(ctx, p) }];
    case 'contribution': return [{ name: 'contribution', rendered: contributionWidget(ctx, p) }];
    case 'achievements': return [{ name: 'achievements', rendered: achievementsWidget(ctx, p) }];
    case 'combat': return [{ name: 'combat', rendered: combatWidget(ctx, p) }];
    case 'hours': return [{ name: 'hours', rendered: hoursWidget(ctx, p, config.timezone) }];
    case 'activity': return [{ name: 'activity', rendered: config.activity === 'raid' ? raidWidget(ctx, p) : ariseWidget(ctx, p) }];
    case 'daily': return [{ name: 'daily', rendered: dailyWidget(ctx, p, config.timezone) }];
  }
};

export const renderWidgets = (p: Player, config: AwakenConfig, mode: ThemeMode, only: WidgetId[] = config.widgets): WidgetFile[] => {
  const theme = resolveTheme(config.theme);
  const ctx: Ctx = { t: theme[mode], mode, motion: config.motion, icons: config.icons };
  return only.flatMap((id) => render(id, ctx, p, config).map(({ name, rendered }) => ({ name, widget: id, svg: toSvg(ctx, rendered), width: rendered.width })));
};
