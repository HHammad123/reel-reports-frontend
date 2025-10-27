import React, { useState } from 'react'
import KonvImageEditor from '../Components/ImageEdit/KonvImageEditor';


const ImageEdit = () => {
  const [src, onChange] = useState('https://apekani.diamonds/cdn/shop/files/IMG_1560.webp?v=1750239193&width=750');
  return (
    <div>
     <KonvImageEditor /> 
    </div>
  )
}

export default ImageEdit