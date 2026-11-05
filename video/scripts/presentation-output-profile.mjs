export function presentationOutputProfile(presentationPackage) {
  if (!presentationPackage) {
    return {
      profile: null,
      compositionId: 'BlogReel',
      outputDimensions: {width: 720, height: 1280},
      sizeFitThreshold: 45_000_000,
      qualityProfile: 'standard',
      highQualityFlags: false,
    };
  }
  if (presentationPackage.profile === 'business-growth-v1') {
    return {
      profile: 'business-growth-v1',
      compositionId: 'BusinessGrowthPresentation',
      outputDimensions: {width: 1080, height: 1920},
      sizeFitThreshold: 50_000_000,
      qualityProfile: 'business-growth-1080p-crf20-slow',
      highQualityFlags: true,
    };
  }
  if (presentationPackage.profile !== null && presentationPackage.profile !== undefined) {
    throw new Error(`Unsupported presentation profile: ${presentationPackage.profile}`);
  }
  return {
    profile: null,
    compositionId: 'BlogReel',
    outputDimensions: {width: 720, height: 1280},
    sizeFitThreshold: 45_000_000,
    qualityProfile: 'presentation-720p-crf20-slow',
    highQualityFlags: true,
  };
}
