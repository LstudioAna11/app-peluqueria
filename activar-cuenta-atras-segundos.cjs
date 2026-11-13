// Ejecutar junto a package.json: node activar-cuenta-atras-segundos.cjs
function patchSeconds(original){
 const replace=(from,to)=>{if(original.split(from).length!==2)throw Error('La cuenta atrás tiene otra versión. No se ha cambiado nada. Envíame src/AppointmentCountdown.tsx para adaptarla.');original=original.replace(from,to);};
 replace('export function countdownParts(start:number,now:number){const minutes=Math.max(0,Math.ceil((start-now)/60000));return [Math.floor(minutes/1440),Math.floor(minutes/60)%24,minutes%60];}','export function countdownParts(start:number,now:number){const seconds=Math.max(0,Math.ceil((start-now)/1000));return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];}');
 replace('Math.min(60000,60000-Date.now()%60000+30)','Math.min(1000,1000-Date.now()%1000+15)');
 replace('${values[1]} horas y ${values[2]} minutos','${values[1]} horas, ${values[2]} minutos y ${values[3]} segundos');
 replace('<small style={{fontSize:12}}>min</small></span></p>','<small style={{fontSize:12}}>min</small> · {String(values[3]).padStart(2,\'0\')} <small style={{fontSize:12}}>s</small></span></p>');
 return original+'\n// lst-countdown-live-seconds-v1\n';
};


const fs=require('fs'),path=require('path');
try{
 if(!fs.existsSync('package.json'))throw Error('Sube activar-cuenta-atras-segundos.cjs junto a package.json, fuera de src.');
 const file='src/AppointmentCountdown.tsx',original=fs.readFileSync(file,'utf8');
 if(original.includes('// lst-countdown-live-seconds-v1')){console.log('Segundos ya activados. Ejecuta npm run build y Publish / Update.');process.exit(0);}
 const output=patchSeconds(original),backup='respaldo-cuenta-atras-'+Date.now();fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'AppointmentCountdown.tsx'),original);
 try{fs.writeFileSync(file,output);}catch(error){fs.writeFileSync(file,original);throw error;}
 console.log('Cuenta atrás con días, horas, minutos y segundos. Se actualiza cada segundo visible y se recalcula al volver. No añade consultas al servidor. Respaldo: '+backup+'. Ejecuta npm run build y Publish / Update.');
}catch(error){console.error(error.message);process.exitCode=1;}
