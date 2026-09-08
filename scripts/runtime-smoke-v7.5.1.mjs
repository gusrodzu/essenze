const base=process.env.API_URL||'http://localhost:4000/api';
async function probe(path){
  try{
    const res=await fetch(`${base}${path}`);
    let body=null;
    try{body=await res.json()}catch{}
    return {path,status:res.status,ok:res.ok,body};
  }catch(error){
    return {path,status:null,ok:false,error:error.message};
  }
}
const results=await Promise.all([probe('/health'),probe('/ready')]);
for(const r of results){
  console.log(`${r.ok?'PASS':'FAIL'} ${r.path} ${r.status??'-'}`);
  console.log(r.body??r.error??'');
}
if(results.some(r=>!r.ok))process.exitCode=1;
