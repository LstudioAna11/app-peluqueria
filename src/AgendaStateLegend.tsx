import React from 'react';
import './agenda-soft-states.css';
export default function AgendaStateLegend(){return <div className="asl-legend" aria-label="Estados de los huecos de la agenda">{[{state:'available',label:'Disponible'},{state:'off-hours',label:'Fuera de horario'},{state:'closed',label:'Cierre / festivo'},{state:'blocked',label:'Bloqueo'}].map(item=><span key={item.state}><i data-studio-state={item.state} aria-hidden="true"/>{item.label}</span>)}</div>;}
