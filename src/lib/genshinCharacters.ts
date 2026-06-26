// Curated avatarId -> character metadata lookup.
//
// Enka.Network's UID endpoint returns characters as numeric `avatarId`s only — it does not
// include human-readable names in the response. There's no small, officially-stable JSON file
// for this, so this table is maintained by hand and covers the roster as of patch 6.6 (Luna VII,
// May 2026). If a brand-new character (e.g. from 6.7+) doesn't show up by name, this table is the
// file to extend — add a row with their avatarId (visible in the raw Enka response/network tab)
// and the lookup will pick it up automatically. Anything missing falls back gracefully to a
// generic "Character #<id>" label rather than breaking the page.

export type Element = 'Pyro' | 'Hydro' | 'Anemo' | 'Electro' | 'Dendro' | 'Cryo' | 'Geo' | 'Unknown'
export type WeaponType = 'Sword' | 'Claymore' | 'Polearm' | 'Bow' | 'Catalyst'

export interface CharacterMeta {
  name: string
  element: Element
  weapon: WeaponType
  rarity: 4 | 5
  iconKey: string // e.g. UI_AvatarIcon_Ambor -> https://enka.network/ui/UI_AvatarIcon_Ambor.png
}

export const CHARACTER_MAP: Record<number, CharacterMeta> = {
  10000002: { name: 'Kamisato Ayaka', element: 'Cryo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Ayaka' },
  10000003: { name: 'Jean', element: 'Anemo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Qin' },
  10000005: { name: 'Traveler', element: 'Anemo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_PlayerBoy' },
  10000006: { name: 'Lisa', element: 'Electro', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Lisa' },
  10000007: { name: 'Traveler', element: 'Anemo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_PlayerGirl' },
  10000014: { name: 'Barbara', element: 'Hydro', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Barbara' },
  10000015: { name: 'Kaeya', element: 'Cryo', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Kaeya' },
  10000016: { name: 'Diluc', element: 'Pyro', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Diluc' },
  10000020: { name: 'Razor', element: 'Electro', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Razor' },
  10000021: { name: 'Amber', element: 'Pyro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Ambor' },
  10000022: { name: 'Venti', element: 'Anemo', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Venti' },
  10000023: { name: 'Xiangling', element: 'Pyro', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Xiangling' },
  10000024: { name: 'Beidou', element: 'Electro', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Beidou' },
  10000025: { name: 'Xingqiu', element: 'Hydro', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Xingqiu' },
  10000026: { name: 'Xiao', element: 'Anemo', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Xiao' },
  10000027: { name: 'Ningguang', element: 'Geo', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Ningguang' },
  10000029: { name: 'Klee', element: 'Pyro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Klee' },
  10000030: { name: 'Zhongli', element: 'Geo', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Zhongli' },
  10000031: { name: 'Fischl', element: 'Electro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Fischl' },
  10000032: { name: 'Bennett', element: 'Pyro', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Bennett' },
  10000033: { name: 'Tartaglia', element: 'Hydro', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Tartaglia' },
  10000034: { name: 'Noelle', element: 'Geo', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Noel' },
  10000035: { name: 'Qiqi', element: 'Cryo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Qiqi' },
  10000036: { name: 'Chongyun', element: 'Cryo', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Chongyun' },
  10000037: { name: 'Ganyu', element: 'Cryo', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Ganyu' },
  10000038: { name: 'Albedo', element: 'Geo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Albedo' },
  10000039: { name: 'Diona', element: 'Cryo', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Diona' },
  10000041: { name: 'Mona', element: 'Hydro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Mona' },
  10000042: { name: 'Keqing', element: 'Electro', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Keqing' },
  10000043: { name: 'Sucrose', element: 'Anemo', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Sucrose' },
  10000044: { name: 'Xinyan', element: 'Pyro', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Xinyan' },
  10000045: { name: 'Rosaria', element: 'Cryo', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Rosaria' },
  10000046: { name: 'Hu Tao', element: 'Pyro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Hutao' },
  10000047: { name: 'Kaedehara Kazuha', element: 'Anemo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Kazuha' },
  10000048: { name: 'Yanfei', element: 'Pyro', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Feiyan' },
  10000049: { name: 'Yoimiya', element: 'Pyro', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Yoimiya' },
  10000050: { name: 'Thoma', element: 'Pyro', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Tohma' },
  10000051: { name: 'Eula', element: 'Cryo', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Eula' },
  10000052: { name: 'Raiden Shogun', element: 'Electro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Shougun' },
  10000053: { name: 'Sayu', element: 'Anemo', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Sayu' },
  10000054: { name: 'Sangonomiya Kokomi', element: 'Hydro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Sangonomiya' },
  10000055: { name: 'Gorou', element: 'Geo', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Gorou' },
  10000056: { name: 'Kujou Sara', element: 'Electro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Sara' },
  10000057: { name: 'Arataki Itto', element: 'Geo', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Itto' },
  10000058: { name: 'Yae Miko', element: 'Electro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Yae' },
  10000059: { name: 'Shikanoin Heizou', element: 'Anemo', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Heizo' },
  10000060: { name: 'Yelan', element: 'Hydro', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Yelan' },
  10000061: { name: 'Kirara', element: 'Dendro', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Momoka' },
  10000062: { name: 'Aloy', element: 'Cryo', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Aloy' },
  10000063: { name: 'Shenhe', element: 'Cryo', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Shenhe' },
  10000064: { name: 'Yun Jin', element: 'Geo', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Yunjin' },
  10000065: { name: 'Kuki Shinobu', element: 'Electro', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Shinobu' },
  10000066: { name: 'Ayato', element: 'Hydro', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Ayato' },
  10000067: { name: 'Collei', element: 'Dendro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Collei' },
  10000068: { name: 'Dori', element: 'Electro', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Dori' },
  10000069: { name: 'Tighnari', element: 'Dendro', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Tighnari' },
  10000070: { name: 'Nilou', element: 'Hydro', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Nilou' },
  10000071: { name: 'Cyno', element: 'Electro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Cyno' },
  10000072: { name: 'Candace', element: 'Hydro', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Candace' },
  10000073: { name: 'Nahida', element: 'Dendro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Nahida' },
  10000074: { name: 'Layla', element: 'Cryo', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Layla' },
  10000075: { name: 'Wanderer', element: 'Anemo', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Wanderer' },
  10000076: { name: 'Faruzan', element: 'Anemo', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Faruzan' },
  10000077: { name: 'Yaoyao', element: 'Dendro', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Yaoyao' },
  10000078: { name: 'Alhaitham', element: 'Dendro', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Alhatham' },
  10000079: { name: 'Dehya', element: 'Pyro', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Dehya' },
  10000080: { name: 'Mika', element: 'Cryo', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Mika' },
  10000081: { name: 'Kaveh', element: 'Dendro', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Kaveh' },
  10000082: { name: 'Baizhu', element: 'Dendro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Baizhuer' },
  10000083: { name: 'Lynette', element: 'Anemo', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Lynette' },
  10000084: { name: 'Lyney', element: 'Pyro', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Liney' },
  10000085: { name: 'Freminet', element: 'Cryo', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Freminet' },
  10000086: { name: 'Wriothesley', element: 'Cryo', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Wriothesley' },
  10000087: { name: 'Neuvillette', element: 'Hydro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Neuvillette' },
  10000088: { name: 'Charlotte', element: 'Cryo', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Charlotte' },
  10000089: { name: 'Furina', element: 'Hydro', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Furina' },
  10000090: { name: 'Chevreuse', element: 'Pyro', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Chevreuse' },
  10000091: { name: 'Navia', element: 'Geo', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Navia' },
  10000092: { name: 'Gaming', element: 'Pyro', weapon: 'Claymore', rarity: 4, iconKey: 'UI_AvatarIcon_Gaming' },
  10000093: { name: 'Xianyun', element: 'Anemo', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Liuyun' },
  10000094: { name: 'Chiori', element: 'Geo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Chiori' },
  10000095: { name: 'Sigewinne', element: 'Hydro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Sigewinne' },
  10000096: { name: 'Arlecchino', element: 'Pyro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Arlecchino' },
  10000097: { name: 'Sethos', element: 'Electro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Sethos' },
  10000098: { name: 'Clorinde', element: 'Electro', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Clorinde' },
  10000099: { name: 'Sethos', element: 'Electro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Sethos' },
  10000100: { name: 'Emilie', element: 'Dendro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Emilie' },
  10000101: { name: 'Kachina', element: 'Geo', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Kachina' },
  10000102: { name: 'Kinich', element: 'Dendro', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Kinich' },
  10000103: { name: 'Mualani', element: 'Hydro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Mualani' },
  10000104: { name: 'Xilonen', element: 'Geo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Xilonen' },
  10000105: { name: 'Ororon', element: 'Electro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Ouronen' },
  10000106: { name: 'Chasca', element: 'Anemo', weapon: 'Bow', rarity: 5, iconKey: 'UI_AvatarIcon_Chasca' },
  10000107: { name: 'Mavuika', element: 'Pyro', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Mavuika' },
  10000108: { name: 'Citlali', element: 'Cryo', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Citlali' },
  10000109: { name: 'Lan Yan', element: 'Anemo', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Lanyan' },
  10000110: { name: 'Ineffa', element: 'Electro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Yumemizuki' },
  10000111: { name: 'Varesa', element: 'Electro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Varesa' },
  10000112: { name: 'Iansan', element: 'Electro', weapon: 'Polearm', rarity: 4, iconKey: 'UI_AvatarIcon_Iansan' },
  10000113: { name: 'Escoffier', element: 'Cryo', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Escoffier' },
  10000114: { name: 'Skirk', element: 'Cryo', weapon: 'Sword', rarity: 5, iconKey: 'UI_AvatarIcon_Skirk' },
  10000115: { name: 'Dahlia', element: 'Hydro', weapon: 'Sword', rarity: 4, iconKey: 'UI_AvatarIcon_Dahlia' },
  10000116: { name: 'Lauma', element: 'Dendro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Lauma' },
  10000117: { name: 'Ifa', element: 'Anemo', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Ifa' },
  10000118: { name: 'Flins', element: 'Pyro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Flins' },
  10000119: { name: 'Varka', element: 'Cryo', weapon: 'Claymore', rarity: 5, iconKey: 'UI_AvatarIcon_Varka' },
  10000120: { name: 'Nicole', element: 'Pyro', weapon: 'Catalyst', rarity: 5, iconKey: 'UI_AvatarIcon_Nicole' },
  10000121: { name: 'Durin', element: 'Pyro', weapon: 'Bow', rarity: 4, iconKey: 'UI_AvatarIcon_Durin' },
  10000122: { name: 'Prune', element: 'Anemo', weapon: 'Catalyst', rarity: 4, iconKey: 'UI_AvatarIcon_Prune' },
  10000123: { name: 'Lohen', element: 'Hydro', weapon: 'Polearm', rarity: 5, iconKey: 'UI_AvatarIcon_Lohen' },
}

export function getCharacterMeta(avatarId: number): CharacterMeta {
  return CHARACTER_MAP[avatarId] ?? {
    name: `Character #${avatarId}`,
    element: 'Unknown',
    weapon: 'Sword',
    rarity: 4,
    iconKey: '',
  }
}

export const ELEMENT_COLORS: Record<Element, string> = {
  Pyro: '#f87171',
  Hydro: '#22d3ee',
  Anemo: '#34d399',
  Electro: '#c084fc',
  Dendro: '#a3e635',
  Cryo: '#7dd3fc',
  Geo: '#fbbf24',
  Unknown: '#8892b0',
}
