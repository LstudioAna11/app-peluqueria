--- a/src/App.tsx
+++ b/src/App.tsx
@@ -3669,11 +3669,14 @@
     return (saved && !sameCatalogText(saved, original) ? saved : '')
       || catalogServiceCopy(catalogLanguage, sub.id, field, original) || original;
   };
-  const portalServiceTitle = (sub: SubService) => {
+  const portalServiceTitle = (sub: SubService, reservationNameOnly = false) => {
     if (catalogLanguage === 'es') return bookingName(sub);
     const saved = sub.translations?.[catalogLanguage];
     const title = saved?.bookingName?.trim();
     if (title && !sameCatalogText(title, sub.bookingName || '')) return title;
+    if (reservationNameOnly) {
+      return catalogServiceCopy(catalogLanguage, sub.id, 'bookingName', sub.bookingName) || bookingName(sub);
+    }
     const name = saved?.name?.trim();
     if (name && !sameCatalogText(name, sub.name)) return name;
     return catalogServiceCopy(catalogLanguage, sub.id, 'bookingName', sub.bookingName)
@@ -4769,8 +4772,10 @@
     </div></>;
   };
 
-  const renderClientPushPanel = () => (<section style={{ padding: '12px', background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px' }}>
-              <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '0 0 10px' }}>{t('navAlerts')}: <strong style={{ color: pushStatus === 'subscribed' ? '#8FC98F' : '#E4C687' }}>{pushStatusLabel()}</strong></p>
+  const renderClientPushPanel = (showStatus = true) => (<section style={showStatus
+    ? { padding: '12px', background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px' }
+    : { padding: '0 12px 12px' }}>
+              {showStatus && <p style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6, margin: '0 0 10px' }}>{t('navAlerts')}: <strong style={{ color: pushStatus === 'subscribed' ? '#8FC98F' : '#E4C687' }}>{pushStatusLabel()}</strong></p>}
               {pushNeedsLogin && <div style={{ marginBottom: '12px', color: '#FFF8EE' }}>
                 <label htmlFor="push-login-pin">{t('pushPanelPin')}</label>
                 <input id="push-login-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pushLoginPin} onChange={event => setPushLoginPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} style={{ display: 'block', margin: '8px 0', padding: '10px', color: '#2C2521', background: '#EADCC7' }} />
@@ -4793,6 +4798,14 @@
         .lst-app-header-sub { color: #C9BCA9; font-size: 9px; letter-spacing: 2px; margin: 2px 0 0; text-align: center; }
         .lst-app-header-btn { background: none; border: none; color: #FFF8EE; width: 40px; height: 40px; min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 50%; padding: 0; }
         .lst-app-header-btn:hover { background: rgba(255, 248, 238, 0.14); }
+        .lst-booking-review { display: grid; gap: 10px; border-top: 1px solid #3A312A; padding-top: 14px; }
+        .lst-booking-review-services { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; color: #FFF8EE; font-size: 14px; line-height: 1.45; }
+        .lst-booking-review-services span { color: #D6CBB8; }
+        .lst-booking-disclosure { background: #322A25; border: 1px solid #655039; border-radius: 8px; }
+        .lst-booking-disclosure > summary { box-sizing: border-box; min-height: 44px; align-content: center; padding: 10px 12px; color: #E4C687; font-size: 14px; line-height: 1.4; cursor: pointer; }
+        .lst-booking-disclosure > summary::marker { color: #E4C687; }
+        .lst-booking-disclosure > summary:focus-visible { outline: 2px solid #E4C687; outline-offset: 2px; border-radius: 8px; }
+        .lst-booking-disclosure > summary small { color: #D6CBB8; margin-inline-start: 6px; }
         .lst-card { background: #322A25; border: 1px solid rgba(255, 248, 238, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); }
         .lst-card-media { width: 100%; height: 200px; object-fit: cover; display: block; }
         .lst-ai-tag { position: absolute; top: 10px; right: 10px; background: rgba(20, 15, 12, 0.66); color: #FBF6EC; font-size: 10px; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; }
@@ -5642,21 +5655,31 @@
                   name: serviceText(sub, 'name') + (variant ? ' · ' + variantText(variant, sub) : ''),
                 }))} />}
           </section>
-          <div style={{ borderTop: '1px solid #3A312A', paddingTop: '18px' }}>
-            <p style={{ color: '#D6CBB8', fontSize: '13px', lineHeight: 1.6 }}>{selectedServicesToBook.map(item => serviceText(catalog.flatMap(category => category.subservices).find(service => service.id === item.sub.id) || item.sub, 'name') + (item.variant ? ` · ${variantText(item.variant, item.sub)}` : '')).join(' + ')}</p>
-            {(() => { const totalSel = getSelectionTotal(selectedServicesToBook); if (!portalShowsPrices || totalSel.total <= 0) return null; return <p style={{ color: totalSel.orientative ? '#E4C687' : '#FFF8EE', fontSize: '13px', margin: '6px 0 0' }}>{totalSel.orientative ? t('bookingEstimate') : t('bookingTotal')}: {new Intl.NumberFormat(portalLocale,{style:'currency',currency:'EUR'}).format(totalSel.total)}{totalSel.orientative ? ' · '+t('bookingConfirmInStudio') : ''}</p>; })()}
-            {selectedVisualTime && <p style={{ color: '#FFF8EE', fontSize: '15px' }}>{bookingDate.toLocaleDateString(portalLocale, { day: 'numeric', month: 'long' })} · {selectedVisualTime}</p>}
-            <section style={{padding:12,background:'#322A25',border:'1px solid #655039',borderRadius:8}}>
-              <label htmlFor="booking-client-note" style={{display:'block',color:'#E4C687',fontSize:14}}>{t('bookingNote')} <small style={{color:'#D6CBB8'}}>{t('bookingOptional')}</small></label>
-              <textarea id="booking-client-note" maxLength={500} rows={3} value={bookingClientNote} disabled={visualBookingBusy||!!visualBookingAttemptRef.current} onChange={event=>setBookingClientNote(event.target.value)} placeholder={t('bookingNotePlaceholder')} aria-describedby="booking-client-note-help" style={{display:'block',width:'100%',boxSizing:'border-box',margin:'8px 0',padding:10,border:'1px solid #806340',borderRadius:6,background:'#29231F',color:'#FFF8EE',fontSize:14,resize:'vertical'}}/>
-              <small id="booking-client-note-help" style={{display:'block',color:'#D6CBB8',lineHeight:1.5}}>{bookingClientNote.length}/500 · {t('bookingNoteHelp')}{visualBookingAttemptRef.current?' '+t('bookingNotePending'):''}</small>
-            </section>
+          <div className="lst-booking-review">
+            {(() => { const totalSel = getSelectionTotal(selectedServicesToBook); if (!portalShowsPrices || totalSel.total <= 0) return null; return <p style={{ color: totalSel.orientative ? '#E4C687' : '#FFF8EE', fontSize: '13px', margin: 0 }}>{totalSel.orientative ? t('bookingEstimate') : t('bookingTotal')}: {new Intl.NumberFormat(portalLocale,{style:'currency',currency:'EUR'}).format(totalSel.total)}{totalSel.orientative ? ' · '+t('bookingConfirmInStudio') : ''}</p>; })()}
+            {selectedVisualTime && <p style={{ color: '#FFF8EE', fontSize: '15px', margin: 0 }}>{bookingDate.toLocaleDateString(portalLocale, { day: 'numeric', month: 'long' })} · {selectedVisualTime}</p>}
+            <ul className="lst-booking-review-services" aria-label={catalogUi('selection')}>
+              {selectedServicesToBook.map(({ sub, variant }) => <li key={sub.id}>
+                <strong>{portalServiceTitle(latestSub(sub), true)}</strong>
+                {variant && <span> · {variantText(variant, sub)}</span>}
+              </li>)}
+            </ul>
+            <details className="lst-booking-disclosure">
+              <summary id="booking-client-note-title">{t('bookingNote')} <small>{bookingClientNote ? `${bookingClientNote.length}/500` : t('bookingOptional')}</small></summary>
+              <div style={{padding:'0 12px 12px'}}>
+                <textarea id="booking-client-note" maxLength={500} rows={2} value={bookingClientNote} disabled={visualBookingBusy||!!visualBookingAttemptRef.current} onChange={event=>setBookingClientNote(event.target.value)} placeholder={t('bookingNotePlaceholder')} aria-labelledby="booking-client-note-title" aria-describedby={visualBookingAttemptRef.current ? 'booking-client-note-pending' : undefined} style={{display:'block',width:'100%',boxSizing:'border-box',padding:10,border:'1px solid #806340',borderRadius:6,background:'#29231F',color:'#FFF8EE',fontSize:16,resize:'vertical'}}/>
+                {visualBookingAttemptRef.current && <small id="booking-client-note-pending" style={{display:'block',color:'#D6CBB8',lineHeight:1.5}}>{t('bookingNotePending')}</small>}
+              </div>
+            </details>
             <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: '#322A25', border: '1px solid rgba(255, 248, 238, 0.08)', borderRadius: '8px', cursor: 'pointer' }}>
               <input type="checkbox" checked={whatsappConsent} onChange={e => setWhatsappConsent(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: '#C49A58', flexShrink: 0 }} />
               <span style={{ color: '#D6CBB8', fontSize: '12px', lineHeight: 1.6 }}>{t('bookingWhatsAppConsent')}</span>
             </label>
             {renderPromotionSummary()}
-            {renderClientPushPanel()}
+            <details className="lst-booking-disclosure">
+              <summary>{t('navAlerts')} <small>{pushStatusLabel()}</small></summary>
+              {renderClientPushPanel(false)}
+            </details>
             {visualBookingError && <p role="alert" style={{ color: '#FFC4B5', fontSize: 13, lineHeight: 1.5 }}>{visualBookingError}</p>}
             {visualBookingBusy && <p role="status" style={{ color: '#E4C687', fontSize: 13 }}>{t('bookingSaving')}</p>}
             <BookingVoucher t={t} locale={portalLocale} selectedId={selectedVoucherId} onChange={setSelectedVoucherId} services={selectedServicesToBook} dateKey={formatDateKey(bookingDate)} promotionId={selectedPromotionId}/>
