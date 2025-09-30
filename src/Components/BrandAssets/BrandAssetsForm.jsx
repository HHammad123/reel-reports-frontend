import React, { useMemo, useState } from 'react';
import useBrandAssets from '../../hooks/useBrandAssets';
import FileUpload from './FileUpload';

export default function BrandAssetsForm({ userId, showSections = { logos: true, icons: true, voiceovers: true } }) {
  const { loading, error, uploadBrandAssets } = useBrandAssets();
  const [fonts, setFonts] = useState('');
  const [colors, setColors] = useState('');
  const [captionLocation, setCaptionLocation] = useState('');
  const [logoFiles, setLogoFiles] = useState([]);
  const [iconFiles, setIconFiles] = useState([]);
  const [voiceFiles, setVoiceFiles] = useState([]);
  const [message, setMessage] = useState('');

  const fontList = useMemo(() => fonts.split(',').map(s => s.trim()).filter(Boolean), [fonts]);
  const colorList = useMemo(() => colors.split(',').map(s => s.trim()).filter(Boolean), [colors]);

  const onSubmit = async (e) => {
    e.preventDefault(); setMessage('');
    try {
      const files = { logos: logoFiles, icons: iconFiles, voiceovers: voiceFiles };
      const payload = { userId, fonts: fontList, colors: colorList };
      if (captionLocation) {
        try { payload.caption_location = JSON.parse(captionLocation); }
        catch { payload.caption_location = captionLocation; }
      }
      payload.files = files;
      await uploadBrandAssets(payload);
      setMessage('Uploaded successfully');
      // Clear file selections but keep text inputs
      setLogoFiles([]); setIconFiles([]); setVoiceFiles([]);
    } catch (e2) {
      setMessage(e2?.message || 'Upload failed');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fonts (comma separated)</label>
          <input value={fonts} onChange={(e) => setFonts(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Poppins, Inter" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Colors (comma separated)</label>
          <input value={colors} onChange={(e) => setColors(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="#000000, #FFFFFF" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Caption Location (JSON)</label>
        <textarea value={captionLocation} onChange={(e) => setCaptionLocation(e.target.value)} rows={3} className="w-full border rounded px-3 py-2" placeholder='{"position":"bottom","style":"subtle"}' />
      </div>

      {showSections.logos && (
        <div>
          <h4 className="font-medium mb-2">Logos</h4>
          <FileUpload label="Upload logos" accept="image/*" multiple maxSizeMB={10} fileTypes={[".jpg",".jpeg",".png",".gif",".webp","image/"]} onFilesChange={setLogoFiles} />
        </div>
      )}
      {showSections.icons && (
        <div>
          <h4 className="font-medium mb-2">Icons</h4>
          <FileUpload label="Upload icons" accept="image/*" multiple maxSizeMB={10} fileTypes={[".jpg",".jpeg",".png",".gif",".webp","image/"]} onFilesChange={setIconFiles} />
        </div>
      )}
      {showSections.voiceovers && (
        <div>
          <h4 className="font-medium mb-2">Voiceovers</h4>
          <FileUpload label="Upload voice files" accept="audio/*" multiple maxSizeMB={50} fileTypes={[".mp3",".wav",".m4a",".aac",".ogg","audio/"]} onFilesChange={setVoiceFiles} />
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
      {message && <div className="text-sm text-green-700">{message}</div>}

      <button type="submit" disabled={loading} className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#13008B] hover:opacity-90'}`}>
        {loading ? 'Uploading…' : 'Save to Brand Assets'}
      </button>
    </form>
  );
}

