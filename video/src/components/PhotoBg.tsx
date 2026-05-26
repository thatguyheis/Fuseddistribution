import React from 'react';
import { Img, staticFile } from 'remotion';
import { BRAND } from '../brand';

export const PhotoBg: React.FC<{ photoPath?: string; overlayOpacity?: number }> = ({
  photoPath,
  overlayOpacity = 0.62,
}) => {
  if (!photoPath) return null;
  return (
    <>
      <Img
        src={staticFile(photoPath)}
        style={{
          position: 'absolute', inset: 0,
          width: BRAND.width, height: BRAND.height,
          objectFit: 'cover', objectPosition: 'center',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(4,16,24,${overlayOpacity}) 0%, rgba(4,16,24,${overlayOpacity + 0.1}) 100%)`,
      }} />
    </>
  );
};
