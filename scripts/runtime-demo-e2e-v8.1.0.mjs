const base=(process.env.API_URL||'http://localhost:4000/api').replace(/\/$/,'');
const email=process.env.DEMO_EMAIL||'demo@buzzbee.mx';
const password=process.env.DEMO_PASSWORD||'BuzzBee2026!';

async function request(path,{method='GET',token,body}={}){
  try{
    const response=await fetch(`${base}${path}`,{
      method,
      headers:{
        'Content-Type':'application/json',
        ...(token?{Authorization:`Bearer ${token}`}:{})
      },
      body:body?JSON.stringify(body):undefined
    });
    let data=null;
    try{data=await response.json()}catch{}
    return {path,status:response.status,ok:response.ok,data};
  }catch(error){
    return {path,status:null,ok:false,error:error.message};
  }
}

function print(result,label=result.path){
  const detail=result.data?.message||result.error||'';
  console.log(`${result.ok?'PASS':'FAIL'}  ${label}  ${result.status??'-'}${detail?` · ${detail}`:''}`);
}

console.log('\nBuzzBee Demo Runtime E2E — v8.1.0');
console.log('==================================');

const health=await request('/health');
const ready=await request('/ready');
print(health,'API health');
print(ready,'API ready');

if(!health.ok||!ready.ok){
  console.error('\nLa API/DB no está lista. Levanta npm run dev y confirma PostgreSQL antes de continuar.');
  process.exit(1);
}

const login=await request('/auth/login',{
  method:'POST',
  body:{email,password}
});
print(login,'Login Demo Company');

const token=login.data?.token;
if(!login.ok||!token){
  console.error('\nNo fue posible autenticar Demo Company. Ejecuta npm run db:seed y npm run db:seed:demo-company.');
  process.exit(1);
}

const probes=[
  ['/auth/me','Sesión y tenant'],
  ['/reports/demo-readiness','Demo Readiness'],
  ['/reports/demo','Demo Ejecutiva'],
  ['/procurement/dashboard','Procure-to-Pay'],
  ['/order-to-cash/dashboard','Order-to-Cash'],
  ['/hr-client/dashboard','RRHH Cliente'],
  ['/ai/context','BuzzBee AI Context']
];

const results=[];
for(const [path,label] of probes){
  const result=await request(path,{token});
  results.push([result,label]);
  print(result,label);
}

const readiness=results.find(([r])=>r.path==='/reports/demo-readiness')?.[0]?.data;
if(readiness){
  const score=Number(readiness.score||0);
  console.log(`\nDemo Readiness: ${score}%`);
  for(const item of readiness.checks||[]){
    console.log(`${item.ready?'PASS':'WARN'}  ${item.label}: ${item.count}`);
  }
  if(score<100){
    console.warn('\nLa aplicación funciona, pero el dataset demo aún no cubre el 100% de los bloques.');
  }
}

const failed=results.filter(([r])=>!r.ok);
console.log('\n----------------------------------');
if(failed.length){
  console.log(`Resultado: ${failed.length} prueba(s) fallaron.`);
  process.exit(1);
}
console.log('Resultado: E2E técnico de la demo PASS.');
