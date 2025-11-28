import React from 'react';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';

const rows = [
  { model: 'SORA', type: 'Infographic', imagePerScene: 0.05, videoPerScene: 0.25, merge: 0.1, notes: 'Fast, template-friendly' },
  { model: 'VEO3', type: 'Avatar Based', imagePerScene: 0.08, videoPerScene: 0.45, merge: 0.1, notes: 'Realistic avatar rendering' },
  { model: 'Commercial', type: 'Mixed Media', imagePerScene: 0.06, videoPerScene: 0.40, merge: 0.1, notes: 'Product showcases' },
  { model: 'Corporate', type: 'Presentation', imagePerScene: 0.04, videoPerScene: 0.30, merge: 0.1, notes: 'Slides + charts' },
];

const PriceGuidelines = () => {
  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar />
        <div className='h-[87vh] rounded-lg overflow-y-auto scrollbar-hide my-2 p-4 bg-white'>
          <div className='mb-4'>
            <h2 className='text-2xl font-semibold text-gray-900'>Price Guidelines</h2>
            <p className='text-sm text-gray-600'>Reference pricing per model. Values are illustrative and configurable.</p>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full border border-gray-200 rounded-lg overflow-hidden'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='text-left text-xs font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b'>Model</th>
                  <th className='text-left text-xs font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b'>Type</th>
                  <th className='text-left text-xs font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b'>Image / Scene ($)</th>
                  <th className='text-left text-xs font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b'>Video / Scene ($)</th>
                  <th className='text-left text-xs font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b'>Merge / Final ($)</th>
                  <th className='text-left text-xs font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b'>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className='odd:bg-white even:bg-gray-50'>
                    <td className='px-4 py-3 border-b text-sm text-gray-900 font-medium'>{r.model}</td>
                    <td className='px-4 py-3 border-b text-sm text-gray-700'>{r.type}</td>
                    <td className='px-4 py-3 border-b text-sm text-gray-700'>{r.imagePerScene.toFixed(2)}</td>
                    <td className='px-4 py-3 border-b text-sm text-gray-700'>{r.videoPerScene.toFixed(2)}</td>
                    <td className='px-4 py-3 border-b text-sm text-gray-700'>{r.merge.toFixed(2)}</td>
                    <td className='px-4 py-3 border-b text-sm text-gray-600'>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='mt-6 text-xs text-gray-500'>
            All prices are subject to change. Contact support for enterprise pricing or volume discounts.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceGuidelines;

