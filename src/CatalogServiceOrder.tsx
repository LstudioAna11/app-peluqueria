type Placement='before'|'after';
type Category={id:string;subservices:{id:string}[]};
// Move by stable IDs in the complete array. Filters never remove hidden services.
export function moveCatalogService<T extends Category>(catalog:T[],categoryId:string,serviceId:string,targetId:string,placement:Placement):T[]{
 if(serviceId===targetId)return catalog;
 const category=catalog.find(item=>item.id===categoryId);if(!category)return catalog;
 const from=category.subservices.findIndex(item=>item.id===serviceId),target=category.subservices.findIndex(item=>item.id===targetId);
 if(from<0||target<0)return catalog;
 const rows=[...category.subservices],moved=rows.splice(from,1)[0],destination=rows.findIndex(item=>item.id===targetId)+(placement==='after'?1:0);
 rows.splice(destination,0,moved);
 if(rows.every((item,index)=>item===category.subservices[index]))return catalog;
 return catalog.map(item=>item.id===categoryId?{...item,subservices:rows} as T:item);
}
export default function CatalogServiceOrder({serviceId,name,visibleIds,disabled=false,onMove}:{serviceId:string;name:string;visibleIds:string[];disabled?:boolean;onMove:(targetId:string,placement:Placement)=>void}){
 const index=visibleIds.indexOf(serviceId);
 const style={minWidth:44,minHeight:44,padding:'5px 9px',background:'#322A25',border:'1px solid #806340',borderRadius:7,color:'#E4C687',fontSize:19,cursor:'pointer'};
 return <div className="lst-service-order-v1" role="group" aria-label={'Orden de '+name} style={{display:'flex',gap:6,alignItems:'center'}}>
  <span style={{fontSize:11,color:'#D6CBB8'}}>Orden</span>
  <button type="button" aria-label={'Subir '+name} title="Subir servicio" disabled={disabled||index<=0} onClick={()=>{if(index>0)onMove(visibleIds[index-1],'before');}} style={style}>↑</button>
  <button type="button" aria-label={'Bajar '+name} title="Bajar servicio" disabled={disabled||index<0||index>=visibleIds.length-1} onClick={()=>{if(index>=0&&index<visibleIds.length-1)onMove(visibleIds[index+1],'after');}} style={style}>↓</button>
 </div>;
}
