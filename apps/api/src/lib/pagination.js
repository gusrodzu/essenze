export function paginationFromQuery(query,{defaultSize=50,maxSize=250}={}){
  const page=Math.max(Number.parseInt(query?.page,10)||1,1);
  const pageSize=Math.min(Math.max(Number.parseInt(query?.pageSize,10)||defaultSize,1),maxSize);
  return {page,pageSize,skip:(page-1)*pageSize,take:pageSize};
}
export function pageMeta({page,pageSize,total}){
  return {page,pageSize,total,pages:Math.max(Math.ceil(total/pageSize),1),hasNext:page*pageSize<total,hasPrevious:page>1};
}
