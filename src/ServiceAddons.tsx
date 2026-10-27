import React from 'react';
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
      const selected=items.find(i=>valid.some(s=>s.id===i.sub.id));
      if(!selected)return `Completa «${owner.bookingName||owner.name}»: elige ${group.title.toLowerCase()} antes de seleccionar hora.`;
      const current=valid.find(s=>s.id===selected.sub.id)!;
      if(current.hasVariants&&current.variants?.length&&!current.variants.some(v=>v.id===selected.variant?.id))return `Elige la variante de «${current.bookingName||current.name}».`;
    }
  }
  return null;
}
export function AddonEditor({sub,catalog,onChange}:{sub:SubService;catalog:CatalogCategory[];onChange:(groups:AddonGroup[]|undefined)=>void}){
  const groups=sub.addonGroups||[];
  const patch=(id:string,changes:Partial<AddonGroup>)=>onChange(groups.map(g=>g.id===id?{...g,...changes}:g));
  return <section className="studio-editor-booking" style={{padding:16,border:'1px solid #C5A059',borderRadius:10}}>
    <h4>Complementos para completar esta cita</h4>
    <p style={{fontSize:13}}>Crea grupos con las opciones exactas que quieres ofrecer. En un grupo obligatorio, la clienta deberá elegir una opción. Puedes exigir peinado y ofrecer corte en otro grupo.</p>
    {sub.addonGroups===undefined?<button type="button" onClick={()=>onChange([])}>Configurar mi selección de complementos</button>:<>
      {groups.map(group=><fieldset key={group.id} style={{margin:'12px 0',padding:12,border:'1px solid #67543C'}}>
        <label>Nombre del grupo<input value={group.title} onChange={e=>patch(group.id,{title:e.target.value})} placeholder="Ej. Peinado" /></label>
        <label style={{display:'block',marginTop:8}}>Cómo se ofrece <select value={group.mode} onChange={e=>patch(group.id,{mode:e.target.value as AddonGroup['mode']})}>
          <option value="required">Obligatorio · Elegir una opción</option><option value="optional">Opcional · Añadir si lo desea</option><option value="included">Incluido en el pack · Sin cargo ni tiempo adicional</option>
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
export function AddonChoices({owner,catalog,items,setItems,showPrices}:{owner:SubService;catalog:CatalogCategory[];items:Item[];setItems:React.Dispatch<React.SetStateAction<Item[]>>;showPrices:boolean}){
  if(!owner.addonGroups?.length)return null;
  return <section style={{padding:14,border:'1px solid #C5A059',borderRadius:12}}><h3 style={{fontSize:16,color:'#E4C687'}}>Completa tu cita · {owner.bookingName||owner.name}</h3>
    {owner.addonGroups.map(group=><div key={group.id} style={{marginTop:12}}><strong>{group.title}</strong> <span style={{fontSize:12}}>{group.mode==='included'?'Incluido en el pack':group.mode==='required'?'Obligatorio · Elige una opción':'Opcional'}</span>
      {group.mode!=='included'&&catalog.flatMap(c=>c.subservices).filter(s=>s.id!==owner.id&&s.active!==false&&group.serviceIds.includes(s.id)).map(sub=><details key={sub.id} style={{marginTop:8,padding:10,background:'#322A25',borderRadius:8}}>
        <summary style={{cursor:'pointer',minHeight:44}}>＋ {sub.bookingName||sub.name}{items.some(i=>i.sub.id===sub.id)?' · Añadido':''}</summary>
        {(sub.hasVariants&&sub.variants?.length?sub.variants:[null]).map(variant=>{
          const selected=items.some(i=>i.sub.id===sub.id&&(i.variant?.id||'')===(variant?.id||''));
          return <button type="button" key={variant?.id||sub.id} aria-pressed={selected} onClick={()=>setItems(previous=>{
            if(selected)return previous.filter(i=>i.sub.id!==sub.id);
            // One choice per group; other groups and services remain in the booking.
            return [...previous.filter(i=>i.sub.id!==sub.id&&!group.serviceIds.includes(i.sub.id)),{sub,variant}];
          })} style={{display:'block',width:'100%',minHeight:44,padding:10,marginTop:6,border:'1px solid #C5A059',borderRadius:8,background:selected?'#C5A059':'#29231F',color:selected?'#121212':'#FFF8EE'}}>
            {selected?'✓ Quitar':'Añadir'} · {variant?.name||sub.bookingName||sub.name}{showPrices?' · '+(variant?.price||sub.price):''} · {variant?.duration||sub.duration}
          </button>;
        })}
      </details>)}
      {group.mode==='required'&&!catalog.some(c=>c.subservices.some(s=>s.active!==false&&s.id!==owner.id&&group.serviceIds.includes(s.id)))&&<p role="alert">No hay opciones disponibles. Contacta con el estudio para completar la cita.</p>}
    </div>)}
  </section>;
}
