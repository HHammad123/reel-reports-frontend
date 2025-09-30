import React, { useState } from 'react'
import { FaPlay } from 'react-icons/fa'

const Resultarea = ({resultvideo}) => {
  const [notes, setNotes] = useState('')
  const [description, setDescription] = useState('Lorem Ipsum has been the industry\'s standard dummy text ever since the 1750s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.')
  const [videoSrc, setVideoSrc] = useState(resultvideo || '')
  const [aspect, setAspect] = useState('16 / 9')


  return (
    <div className="rounded-lg p-6 bg-white">
      <div className="flex gap-6">
        {/* Left: Video + description */}
        <div className="flex-1">
          <h3 className="text-[18px] font-semibold text-gray-900">See Your Final Video</h3>

          <div className="mt-4 rounded-xl border-4 border-blue-400 overflow-hidden">
            <div className="relative flex justify-center items-center bg-black">
              <video
                className="w-full object-contain"
                style={{ aspectRatio: aspect }}
                controls
                playsInline
                onLoadedMetadata={(e) => {
                  try {
                    const v = e.currentTarget;
                    const w = v.videoWidth || 0;
                    const h = v.videoHeight || 0;
                    if (w > 0 && h > 0) setAspect(`${w} / ${h}`);
                  } catch (_) { /* noop */ }
                }}
              >
                {videoSrc && <source src={videoSrc} type="video/mp4" />}
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="mt-4 relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-gray-100 rounded-lg p-4 pr-28 text-sm text-gray-800 resize-none focus:outline-none"
            />
            <button className="absolute right-3 bottom-0 -translate-y-1/2 rounded-full bg-[#13008B] text-white px-6 py-2">Edit</button>
          </div>
        </div>

        {/* Right: Actions */}
        <aside className="w-[320px] h-full">
          <div className="rounded-xl flex justify-start item-center flex-col border border-[#EEEEEE] p-5 bg-white h-[26rem]">
            <h4 className="font-semibold text-gray-900">Take Actions</h4>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="rounded-full bg-[#13008B] text-white px-4 py-2 text-sm">Edit Video</button>
              <button className="rounded-full bg-[#13008B] text-white px-4 py-2 text-sm">Resolution</button>
              <button className="rounded-full bg-[#13008B] text-white px-4 py-2 text-sm">Fonts</button>
              <button className="rounded-full bg-[#13008B] text-white px-4 py-2 text-sm">Avatar</button>
            </div>

            <textarea
              placeholder="Hi I want to Change the Color and Design of the Whole Video"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-4 w-full h-36 bg-gray-100 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none"
            />

            <button className="mt-4 w-full rounded-full bg-[#13008B] text-white py-2">Update</button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Resultarea


