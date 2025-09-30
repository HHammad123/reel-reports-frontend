import React, { useState } from 'react'
import { Check } from 'lucide-react'

const OPTIONS = [
  {
    id: 'man-moving',
    title: 'Man Moving and Talking',
    image:
      'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'man-board',
    title: 'Man Talking in Front of Board',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'content-table',
    title: 'Content Table',
    image:
      'https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=1600&auto=format&fit=crop'
  }
]

const Settingsarea = () => {
  const [selectedIds, setSelectedIds] = useState(new Set())

  const toggle = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className='w-full h-full'>
      <div className="w-full h-[85vh] rounded-lg p-8 bg-white">
       
          <h3 className="text-gray-900 font-semibold">Choose Your Guidelines Videos</h3>
          <p className="text-gray-600 mt-1">How do you want the Video Look and Feel</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {OPTIONS.map((opt) => {
              const isSelected = selectedIds.has(opt.id)
              return (
                <div key={opt.id} className="">
                  <button
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className="relative block w-full overflow-hidden rounded-lg focus:outline-none"
                  >
                    <img src={opt.image} alt={opt.title} className="h-44 w-full object-cover" />
                   
                  </button>
                  <div className='flex justify-between items-center' >
                 <div className='flex justify-start items-center'>
                 <p className="mt-3 text-gray-800 text-sm">{opt.title}</p>
                 </div>
                     <button
                      type="button"
                      onClick={() => toggle(opt.id)}
                      aria-pressed={isSelected}
                      className={`h-6 w-6 rounded border transition-colors ${
                        isSelected
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-400 border-gray-300'
                      } flex items-center justify-center`}
                    >
                      {isSelected ? <Check size={14} /> : null}
                    </button>
                   </div>
                </div>
              )
            })}
          </div>
      </div>
    </div>
  )
}

export default Settingsarea


