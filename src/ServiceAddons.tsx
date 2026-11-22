import React from 'react';
import { catalogLabel, catalogPrice } from './portalCatalogLabels';
import type {SubService, ServiceVariant, CatalogCategory} from './App';
export type AddonGroup = {id:string;title:string;mode:'optional'|'required'|'included';serviceIds:string[]};
type Item={sub:SubService;variant:ServiceVariant|null};
export function addonError(items:Item[],catalog:CatalogCategory[]):string|null {
  const all=catalog.flatMap(c=>c.subservices);
  for(const item of items){
    const owner=all.find(s=>s.id===item.sub.id)||item.sub;
    for(const group of owner.addonGroups||[]){
      if(group.mode!=='required')continue;
      const valid=all.filter(s=>s.active!==false&&s.id!==owner.id&&group.serviceIds.includes(s.id));
      const selected=items.filter(i=>valid.some(s=>s.id===i.sub.id));
      if(!selected.length)return `Completa «${owner.bookingName||owner.name}»: elige ${group.title.toLowerCase()} antes de seleccionar hora.`;
      for(const choice of selected){
        const current=valid.find(s=>s.id===choice.sub.id)!;
        if(current.hasVariants&&current.variants?.length&&!current.variants.some(v=>v.id===choice.variant?.id))return `Elige la variante de «${current.bookingName||current.name}».`;
      }
    }
  }
  return null;
}
export function AddonEditor({sub,catalog,onChange}:{sub:SubService;catalog:CatalogCategory[];onChange:(groups:AddonGroup[]|undefined)=>void}){
  const groups=sub.addonGroups||[];
  const patch=(id:string,changes:Partial<AddonGroup>)=>onChange(groups.map(g=>g.id===id?{...g,...changes}:g));
  return <section className="studio-editor-booking" style={{padding:16,border:'1px solid #C5A059',borderRadius:10}}>
    <h4>Complementos para completar esta cita</h4>
    <p style={{fontSize:13}}>Crea grupos con las opciones exactas que quieres ofrecer. La clienta puede añadir varios servicios del mismo grupo. En un grupo obligatorio debe elegir al menos uno. Para exigir corte y peinado, crea un grupo obligatorio para cada uno.</p>
    {sub.addonGroups===undefined?<button type="button" onClick={()=>onChange([])}>Configurar mi selección de complementos</button>:<>
      {groups.map(group=><fieldset key={group.id} style={{margin:'12px 0',padding:12,border:'1px solid #67543C'}}>
        <label>Nombre del grupo<input value={group.title} onChange={e=>patch(group.id,{title:e.target.value})} placeholder="Ej. Peinado" /></label>
        <label style={{display:'block',marginTop:8}}>Cómo se ofrece <select value={group.mode} onChange={e=>patch(group.id,{mode:e.target.value as AddonGroup['mode']})}>
          <option value="required">Obligatorio · Al menos un servicio</option><option value="optional">Opcional · Añadir si lo desea</option><option value="included">Incluido en el pack · Sin cargo ni tiempo adicional</option>
        </select></label>
        {group.mode==='included'?<p>Se informa de que está incluido. Ajusta el precio y la duración del pack en Datos.</p>:<div style={{maxHeight:240,overflowY:'auto',marginTop:10}}>
          {catalog.map(cat=><div key={cat.id}><strong>{cat.title}</strong>{cat.subservices.filter(s=>s.id!==sub.id&&s.active!==false).map(option=><label key={option.id} style={{display:'block',padding:6,fontSize:13}}>
            <input type="checkbox" checked={group.serviceIds.includes(option.id)} onChange={e=>patch(group.id,{serviceIds:e.target.checked?[...new Set([...group.serviceIds,option.id])]:group.serviceIds.filter(id=>id!==option.id)})}/> {option.bookingName||option.name} · {option.price} · {option.duration}
          </label>)}</div>)}
        </div>}
        <button type="button" onClick={()=>onChange(groups.filter(g=>g.id!==group.id))}>Eliminar grupo</button>
      </fieldset>)}
      <button type="button" onClick={()=>onChange([...groups,{id:crypto.randomUUID(),title:'',mode:'optional',serviceIds:[]}])}>＋ Añadir grupo de complementos</button>
      <p style={{fontSize:12}}>Los grupos sustituyen los ajustes antiguos de corte, peinado y matiz para este servicio. Guarda el catálogo para publicarlos.</p>
    </>}
  </section>;
}
export function AddonChoices({owner,catalog,items,setItems,showPrices,language = 'es',serviceTitle = sub => sub.bookingName || sub.name,variantTitle = variant => variant.name}:{language?:string;serviceTitle?:(sub:SubService)=>string;variantTitle?:(variant:ServiceVariant,sub:SubService)=>string;owner:SubService;catalog:CatalogCategory[];items:Item[];setItems:React.Dispatch<React.SetStateAction<Item[]>>;showPrices:boolean}){
  const groups = owner.addonGroups ?? [];
  const l = (key: Parameters<typeof catalogLabel>[1]) => catalogLabel(language, key);
  const groupTitle = (title: string) => language !== 'es' && /^peinado$/i.test(title.trim()) ? l('chooseStyling') : title;
  if (!groups.length) return null;
  const available = catalog.flatMap(category => category.subservices).filter(sub => sub.id !== owner.id && sub.active !== false);
  const ordered = [...groups.filter(group => group.mode === 'required'), ...groups.filter(group => group.mode !== 'required')];
  return <div className="lst-addons">{ordered.map(group => {
    if (group.mode === 'included') return <p className="lst-addon-included" key={group.id}>{groupTitle(group.title)} · {l('packageIncluded')}</p>;

    const required = group.mode === 'required';
    const title = group.title.trim() || (required ? 'Peinado' : 'Otros servicios');
    const options = available.filter(sub => group.serviceIds.includes(sub.id));
    const chosen = items.filter(item => options.some(sub => sub.id === item.sub.id));
    const complete = chosen.length > 0 && chosen.every(item => {
      const sub = options.find(option => option.id === item.sub.id);
      return !sub?.hasVariants || !sub.variants?.length || sub.variants.some(variant => variant.id === item.variant?.id);
    });
    const cards = <div className="lst-addon-options">{options.map(sub => <div key={sub.id} className="lst-addon-service">
      <strong>{serviceTitle(sub)}</strong>
      <div className="lst-addon-choices">
        {(sub.hasVariants && sub.variants?.length ? sub.variants : [null]).map(variant => {
          const selected = items.some(item => item.sub.id === sub.id && (item.variant?.id ?? null) === (variant?.id ?? null));
          return <button type="button" key={variant?.id ?? sub.id} aria-pressed={selected} onClick={() => setItems(previous => {
            const alreadySelected = previous.some(item => item.sub.id === sub.id && (item.variant?.id ?? null) === (variant?.id ?? null));
            const remaining = previous.filter(item => item.sub.id !== sub.id);
            return alreadySelected ? remaining : [...remaining, {sub, variant}];
          })}>
            <span>{variant ? variantTitle(variant, sub) : selected ? '✓ ' + l('selected') : l('select')}</span>
            <small>{[showPrices ? catalogPrice(variant?.price || sub.price, language) : '', variant?.duration || sub.duration].filter(Boolean).join(' · ')}</small>
            {selected && <small className="lst-addon-selected">✓ {l('selected')}</small>}
          </button>;
        })}
      </div>
    </div>)}</div>;

    if (!required) return <details key={group.id} className="lst-addon-optional">
      <summary><strong>{l('addMore')}</strong><span className="lst-addon-badge">{l('optional')}</span>{chosen.length > 0 && <small>✓ {chosen.length}</small>}</summary>
      {cards}
    </details>;

    const styling = /peinad|styling/i.test(title);
    return <section key={group.id} className="lst-addon-required" tabIndex={-1}
      data-addon-pending={!complete ? (styling ? 'styling' : 'required') : undefined}>
      <div className="lst-addon-heading">
        <h3>{styling ? l('chooseStyling') : title}</h3>
        <span className="lst-addon-badge">{complete ? '✓ ' + l('selected') : l('required')}</span>
      </div>
      <p>{complete ? l('selected') : l('chooseOptionFirst')}</p>
      {options.length ? cards : <p role="alert">{l('noOptions')}</p>}
    </section>;
  })}</div>;
}
