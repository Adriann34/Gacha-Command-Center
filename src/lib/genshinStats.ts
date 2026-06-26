// Maps Enka's FIGHT_PROP_* keys to display labels + whether the value should be shown as %.
// Reference: https://github.com/EnkaNetwork/API-docs (FightPropMap)

interface FightPropMeta {
  label: string
  isPercent: boolean
}

export const FIGHT_PROP_MAP: Record<string, FightPropMeta> = {
  FIGHT_PROP_BASE_HP: { label: 'Base HP', isPercent: false },
  FIGHT_PROP_HP: { label: 'HP', isPercent: false },
  FIGHT_PROP_HP_PERCENT: { label: 'HP%', isPercent: true },
  FIGHT_PROP_BASE_ATTACK: { label: 'Base ATK', isPercent: false },
  FIGHT_PROP_ATTACK: { label: 'ATK', isPercent: false },
  FIGHT_PROP_ATTACK_PERCENT: { label: 'ATK%', isPercent: true },
  FIGHT_PROP_BASE_DEFENSE: { label: 'Base DEF', isPercent: false },
  FIGHT_PROP_DEFENSE: { label: 'DEF', isPercent: false },
  FIGHT_PROP_DEFENSE_PERCENT: { label: 'DEF%', isPercent: true },
  FIGHT_PROP_HP_MAX: { label: 'Max HP', isPercent: false },
  FIGHT_PROP_ATTACK_MAX: { label: 'ATK', isPercent: false },
  FIGHT_PROP_DEFENSE_MAX: { label: 'DEF', isPercent: false },
  FIGHT_PROP_CRITICAL: { label: 'CRIT Rate', isPercent: true },
  FIGHT_PROP_CRITICAL_HURT: { label: 'CRIT DMG', isPercent: true },
  FIGHT_PROP_CHARGE_EFFICIENCY: { label: 'Energy Recharge', isPercent: true },
  FIGHT_PROP_HEAL_ADD: { label: 'Healing Bonus', isPercent: true },
  FIGHT_PROP_HEALED_ADD: { label: 'Incoming Healing Bonus', isPercent: true },
  FIGHT_PROP_ELEMENT_MASTERY: { label: 'Elemental Mastery', isPercent: false },
  FIGHT_PROP_PHYSICAL_ADD_HURT: { label: 'Physical DMG Bonus', isPercent: true },
  FIGHT_PROP_FIRE_ADD_HURT: { label: 'Pyro DMG Bonus', isPercent: true },
  FIGHT_PROP_WATER_ADD_HURT: { label: 'Hydro DMG Bonus', isPercent: true },
  FIGHT_PROP_WIND_ADD_HURT: { label: 'Anemo DMG Bonus', isPercent: true },
  FIGHT_PROP_ELEC_ADD_HURT: { label: 'Electro DMG Bonus', isPercent: true },
  FIGHT_PROP_ICE_ADD_HURT: { label: 'Cryo DMG Bonus', isPercent: true },
  FIGHT_PROP_ROCK_ADD_HURT: { label: 'Geo DMG Bonus', isPercent: true },
  FIGHT_PROP_GRASS_ADD_HURT: { label: 'Dendro DMG Bonus', isPercent: true },
}

export function formatFightProp(key: string, value: number): string {
  const meta = FIGHT_PROP_MAP[key]
  if (!meta) return value.toFixed(1)
  if (meta.isPercent) return `${(value * 100).toFixed(1)}%`
  return Math.round(value).toLocaleString()
}

export function fightPropLabel(key: string): string {
  return FIGHT_PROP_MAP[key]?.label ?? key.replace('FIGHT_PROP_', '').replace(/_/g, ' ')
}

// Artifact set names by setNameTextMapHash aren't reliably resolvable client-side without the
// full text map, so we group/display artifacts by their equipType + icon instead of set name.
export const ARTIFACT_SLOT_LABELS: Record<string, string> = {
  EQUIP_BRACER: 'Flower of Life',
  EQUIP_NECKLACE: 'Plume of Death',
  EQUIP_SHOES: 'Sands of Eon',
  EQUIP_RING: 'Goblet of Eonothem',
  EQUIP_DRESS: 'Circlet of Logos',
}
