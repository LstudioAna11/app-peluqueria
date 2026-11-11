import React from 'react';
class FeatureBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p role="alert" style={{color:'#E4C687',fontSize:13}}>No se pudo abrir este apartado. Comprueba la conexión y <button type="button" onClick={()=>window.location.reload()} style={{minHeight:44,textDecoration:'underline'}}>vuelve a cargar la app</button>.</p>:this.props.children;}
}
const LazyClientPhotoGallery=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.ClientPhotoGallery})));
export function ClientPhotoGallery(props:React.ComponentProps<(typeof import('./PortalFeatures'))['ClientPhotoGallery']>){return <FeatureBoundary><React.Suspense fallback={<p role="status" style={{color:'#E4C687',fontSize:13,padding:12}}>Cargando…</p>}><LazyClientPhotoGallery {...props}/></React.Suspense></FeatureBoundary>;}
const LazyStudioNews=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.StudioNews})));
const LazyStudioNewsAdmin=React.lazy(()=>import('./StudioNewsAdmin'));
export function StudioNews(props:React.ComponentProps<(typeof import('./PortalFeatures'))['StudioNews']>){return <FeatureBoundary><React.Suspense fallback={<p role="status" style={{color:'#E4C687',fontSize:13,padding:12}}>Cargando…</p>}>{props.admin?<LazyStudioNewsAdmin {...props}/>:<LazyStudioNews {...props}/>}</React.Suspense></FeatureBoundary>;}
const LazyVoucherHub=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.VoucherHub})));
export function VoucherHub(props:React.ComponentProps<(typeof import('./PortalFeatures'))['VoucherHub']>){return <FeatureBoundary><React.Suspense fallback={<p role="status" style={{color:'#E4C687',fontSize:13,padding:12}}>Cargando…</p>}><LazyVoucherHub {...props}/></React.Suspense></FeatureBoundary>;}
const LazyVoucherPanel=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.VoucherPanel})));
export function VoucherPanel(props:React.ComponentProps<(typeof import('./PortalFeatures'))['VoucherPanel']>){return <FeatureBoundary><React.Suspense fallback={<p role="status" style={{color:'#E4C687',fontSize:13,padding:12}}>Cargando…</p>}><LazyVoucherPanel {...props}/></React.Suspense></FeatureBoundary>;}
const LazyBookingVoucher=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.BookingVoucher})));
export function BookingVoucher(props:React.ComponentProps<(typeof import('./PortalFeatures'))['BookingVoucher']>){return <FeatureBoundary><React.Suspense fallback={<p role="status" style={{color:'#E4C687',fontSize:13,padding:12}}>Cargando…</p>}><LazyBookingVoucher {...props}/></React.Suspense></FeatureBoundary>;}
const LazyAppointmentVoucherTools=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.AppointmentVoucherTools})));
export function AppointmentVoucherTools(props:React.ComponentProps<(typeof import('./PortalFeatures'))['AppointmentVoucherTools']>){return <FeatureBoundary><React.Suspense fallback={<p role="status" style={{color:'#E4C687',fontSize:13,padding:12}}>Cargando…</p>}><LazyAppointmentVoucherTools {...props}/></React.Suspense></FeatureBoundary>;}
const LazyClientProfileCompact=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.ClientProfileCompact})));
export function ClientProfileCompact(props:React.ComponentProps<(typeof import('./PortalFeatures'))['ClientProfileCompact']>){return <FeatureBoundary><React.Suspense fallback={<p role="status" style={{color:'#E4C687',fontSize:13,padding:12}}>Cargando…</p>}><LazyClientProfileCompact {...props}/></React.Suspense></FeatureBoundary>;}

// lst-news-compact-admin-v1
