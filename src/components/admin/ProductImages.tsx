'use client'

import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
}

export default function ProductImages({ images, onChange }: Props) {
  const source = useRef<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [target, setTarget] = useState<number | null>(null)

  function reset() {
    source.current = null
    setDragging(null)
    setTarget(null)
  }

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return
    const reordered = [...images]
    const [image] = reordered.splice(from, 1)
    reordered.splice(to, 0, image)
    onChange(reordered)
  }

  if (!images.length) return null

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3" id="product-images-help">
        Перетащите фото мышкой на нужное место. Первое фото — главное.
        Порядок сохранится после нажатия «Сохранить». С клавиатуры: Alt + стрелка влево или вправо.
      </p>
      <div className="flex flex-wrap gap-3" role="list" aria-label="Фотографии товара">
        {images.map((url, index) => (
          <div
            key={index}
            role="listitem"
            className="relative group"
            onDragOver={event => {
              if (source.current === null) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setTarget(index)
            }}
            onDrop={event => {
              if (source.current === null) return
              event.preventDefault()
              move(source.current, index)
              reset()
            }}
          >
            <button
              type="button"
              draggable
              aria-label={`Фото ${index + 1}${index === 0 ? ', главное' : ''}. Переместить`}
              aria-describedby="product-images-help"
              onDragStart={event => {
                source.current = index
                setDragging(index)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', String(index))
              }}
              onDragEnd={reset}
              onKeyDown={event => {
                if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
                event.preventDefault()
                move(index, index + (event.key === 'ArrowLeft' ? -1 : 1))
              }}
              className={`block rounded-lg cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-pink-500 ${dragging === index ? 'opacity-40' : ''} ${target === index && dragging !== index ? 'ring-2 ring-pink-500' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" draggable={false} width={80} height={80}
                className="rounded-lg object-cover border border-gray-100 w-20 h-20 select-none" />
            </button>
            <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
              {index === 0 ? 'Главное' : index + 1}
            </span>
            <button type="button" aria-label={`Удалить фото ${index + 1}`}
              onClick={() => { reset(); onChange(images.filter((_, i) => i !== index)) }}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
