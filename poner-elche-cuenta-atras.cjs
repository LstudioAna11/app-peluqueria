// Colocar junto a package.json. Ejecutar: node poner-elche-cuenta-atras.cjs
const fs=require('fs'),path=require('path');
try{
 if(!fs.existsSync('package.json'))throw Error('Sube poner-elche-cuenta-atras.cjs junto a package.json, fuera de src.');
 const file='src/AppointmentCountdown.tsx',original=fs.readFileSync(file,'utf8'),from='(Madrid)</span>',to='(Elche)</span>';
 if(original.includes(to)&&!original.includes(from)){console.log('La cuenta atrás ya muestra Elche. Ejecuta npm run build y Publish / Update.');process.exit(0);}
 if(original.split(from).length!==2)throw Error('La etiqueta tiene otra versión. No se ha cambiado nada. Envíame src/AppointmentCountdown.tsx para adaptarla.');
 const changed=original.replace(from,to),backup='respaldo-etiqueta-elche-'+Date.now();
 fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'AppointmentCountdown.tsx'),original);
 try{fs.writeFileSync(file,changed);}catch(error){fs.writeFileSync(file,original);throw error;}
 console.log('La cuenta atrás muestra Elche. Respaldo: '+backup+'. Ejecuta npm run build y Publish / Update.');
}catch(error){console.error(error.message);process.exitCode=1;}
