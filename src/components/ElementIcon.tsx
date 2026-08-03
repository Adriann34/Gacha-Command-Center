import { Sparkles } from 'lucide-react'

const ELEMENT_ICON_PATHS: Record<string, string> = {
  Pyro: '/icons/elements/pyro_element.svg',
  Hydro: '/icons/elements/hydro_element.svg',
  Anemo: '/icons/elements/anemo_element.svg',
  Electro: '/icons/elements/electro_element.svg',
  Dendro: '/icons/elements/dendro_element.svg',
  Cryo: '/icons/elements/cryo_element.svg',
  Geo: '/icons/elements/geo_element.svg',
}

export function ElementIcon({ element, size = 14 }: { element: string; size?: number }) {
  const iconPath = ELEMENT_ICON_PATHS[element]

  if (!iconPath) return <Sparkles size={size} strokeWidth={1.7} />

  return <img src={iconPath} alt={`${element} element`} width={size} height={size} style={{ display: 'block', objectFit: 'contain' }} />
}
