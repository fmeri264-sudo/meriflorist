'use client'

import Link from 'next/link'
import { useState } from 'react'
interface Occasion { id: number; name: string; slug: string }
export default function OccasionsList({ occasions }: { occasions: Occasion[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? occasions : occasions.slice(0, 6)
  return <>
    <nav aria-label="Выбрать букет по поводу" className={`mary-occasion-links ${expanded ? 'mary-occasion-links-expanded' : ''}`}>
      {visible.map(o => <Link key={o.id} href={`/catalog?occasion=${encodeURIComponent(o.slug)}`}>{o.name}</Link>)}
      {occasions.length > 6 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)} className="mary-text-link shrink-0">{expanded ? 'Свернуть поводы' : 'Все поводы →'}</button>}
    </nav>
  </>
}
