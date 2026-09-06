import catalog from '../../public/models/catalog.json' with { type: 'json' };

// Same verified manifest drives the model, UI, and published dimensions.
export const REFERENCE_DESIGNS = Object.fromEntries(catalog.assets.map(asset => [asset.type, {
  brand: asset.referenceManufacturer, product: asset.referenceProduct,
  sku: asset.referenceSku, url: asset.referenceUrl,
  dimensions: asset.dimensions, defaultColor: asset.defaultColor,
  tintable: asset.tintMaterials.length > 0,
  openable: asset.pivots.some(pivot => ['rotation','translation'].includes(pivot.motion)),
  elevated: ['tv','cooktop','tableLamp','pendantLamp'].includes(asset.type),
  customEnvelope: asset.type === 'shower',
}]));

export function getReferenceDesign(type) {
  return Object.hasOwn(REFERENCE_DESIGNS, type) ? REFERENCE_DESIGNS[type] : null;
}
