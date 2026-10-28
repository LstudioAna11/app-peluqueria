const KEY = 'lst_pending_catalog_photos_v1';
type PhotoDraft = { categoryId: string; subId?: string; url: string };
type PhotoCategory = {id: string; imageUrl?: string; imageIsAiPlaceholder?: boolean; subservices: {id: string; imageUrl?: string; imageIsAiPlaceholder?: boolean}[]};
function drafts(): PhotoDraft[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is PhotoDraft => !!item && typeof item.categoryId === 'string' && (item.subId === undefined || typeof item.subId === 'string') && typeof item.url === 'string' && item.url.startsWith('https://')).slice(-100) : [];
  } catch { return []; }
}
export function rememberCatalogPhoto(categoryId: string, subId: string | undefined, url: string): void {
  try { sessionStorage.setItem(KEY, JSON.stringify([...drafts().filter(item => item.categoryId !== categoryId || item.subId !== subId), {categoryId, subId, url}])); } catch { /* The in-memory draft still works if browser storage is unavailable. */ }
}
export function restoreCatalogPhotos<T extends PhotoCategory>(catalog: T[]): T[] {
  const pending = drafts();
  return catalog.map(category => {
    const categoryPhoto = pending.find(item => item.categoryId === category.id && item.subId === undefined);
    return {...category, ...(categoryPhoto ? {imageUrl:categoryPhoto.url,imageIsAiPlaceholder:false} : {}), subservices:category.subservices.map(service => {
      const photo=pending.find(item=>item.categoryId===category.id && item.subId===service.id);
      return photo ? {...service,imageUrl:photo.url,imageIsAiPlaceholder:false} : service;
    })};
  });
}
export function clearCatalogPhotos(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* optional recovery */ }
}
export function forgetCatalogPhoto(categoryId: string, subId?: string): void {
  try { sessionStorage.setItem(KEY,JSON.stringify(drafts().filter(item=>item.categoryId!==categoryId || item.subId!==subId))); } catch { /* optional recovery */ }
}
export async function verifyCatalogPhotoUrl(url: string): Promise<void> {
  if (!url.startsWith('https://')) throw new Error('El servidor no devolvió una dirección de foto válida.');
  await new Promise<void>((resolve,reject)=>{
    const image=new Image();
    const timer=setTimeout(()=>finish(new Error('La foto se subió, pero su dirección no responde. Conservamos la foto anterior.')),12000);
    const finish=(error?:Error)=>{clearTimeout(timer);image.onload=null;image.onerror=null;error?reject(error):resolve();};
    image.onload=()=>image.naturalWidth>0?finish():finish(new Error('La foto subida no se puede visualizar.'));
    image.onerror=()=>finish(new Error('La foto se subió, pero no se puede abrir desde su enlace público. Conservamos la foto anterior.'));
    image.src=url;
  });
}
