import {spawn} from 'node:child_process';
import process from 'node:process';

const checkOnly=process.argv.includes('--check');

function run(command,args,{env=process.env,allowFailure=false}={}){
  return new Promise((resolve,reject)=>{
    console.log(`\n> ${command} ${args.join(' ')}`);
    const child=spawn(command,args,{
      stdio:'inherit',
      shell:process.platform==='win32',
      env
    });
    child.on('error',reject);
    child.on('exit',(code)=>{
      if(code===0||allowFailure)return resolve(code);
      reject(new Error(`${command} terminó con código ${code}`));
    });
  });
}

function banner(title){
  console.log(`\n${'='.repeat(66)}\n${title}\n${'='.repeat(66)}`);
}

async function main(){
  banner('BuzzBee Safe Update');

  console.log('Este comando no ejecuta operaciones destructivas de base de datos ni acepta pérdida de datos automáticamente.');

  if(checkOnly){
    await run('npm',['run','db:generate']);
    console.log('\n✓ Prisma Client puede generarse correctamente.');
    return;
  }

  banner('1/4 Dependencias');
  await run('npm',['install']);

  banner('2/4 Prisma Client');
  try{
    await run('npm',['run','db:generate']);
  }catch(error){
    console.error(
      '\nNo se pudo generar Prisma Client. En Windows esto puede ocurrir si '+
      'el proceso API mantiene bloqueado el engine de Prisma.\n'+
      'Detén únicamente el API, vuelve a ejecutar "npm run update" y deja '+
      'PostgreSQL/Docker funcionando.'
    );
    throw error;
  }

  banner('3/4 Sincronización segura de esquema');
  console.log(
    'Prisma se ejecutará en modo no interactivo. Si detecta una operación '+
    'que requiere aceptar pérdida de datos, debe detenerse en vez de aceptarla.'
  );

  const safeEnv={
    ...process.env,
    CI:'1'
  };

  await run('npm',[
    'exec',
    '--workspace','apps/api',
    'prisma','--',
    'db','push',
    '--schema=prisma/schema.prisma'
  ],{env:safeEnv});

  banner('4/4 Datos base / permisos');
  await run('npm',['run','db:seed']);

  banner('Actualización completada');
  console.log(
    '✓ BuzzBee actualizado.\n'+
    'Si "npm run dev" está abierto en otra terminal, Vite actualizará el Web '+
    'y nodemon reiniciará el API automáticamente al cambiar archivos JS.'
  );
}

main().catch((error)=>{
  console.error(`\n✗ Actualización detenida: ${error.message}`);
  console.error(
    'No se ejecutó ningún reset automático. Revisa el error antes de continuar.'
  );
  process.exit(1);
});
