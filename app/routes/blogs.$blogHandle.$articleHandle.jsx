import {Link, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import styles from '~/styles/EditorialPage.module.css';

export const meta=({data})=>[{title:`${data?.article?.seo?.title||data?.article?.title||'Artículo'} | Essenze`},...(data?.article?.seo?.description?[{name:'description',content:data.article.seo.description}]:[])];
export async function loader(args){return {...loadDeferredData(args),...(await loadCriticalData(args))};}
async function loadCriticalData({context,request,params}){
  const {blogHandle,articleHandle}=params;if(!articleHandle||!blogHandle)throw new Response('No encontrado',{status:404});
  const {blog}=await context.storefront.query(ARTICLE_QUERY,{variables:{blogHandle,articleHandle}});if(!blog?.articleByHandle)throw new Response(null,{status:404});
  redirectIfHandleIsLocalized(request,{handle:articleHandle,data:blog.articleByHandle},{handle:blogHandle,data:blog});return {article:blog.articleByHandle,blogHandle};
}
function loadDeferredData(){return {};}
export default function Article(){
  const {article,blogHandle}=useLoaderData();const date=new Intl.DateTimeFormat('es-MX',{year:'numeric',month:'long',day:'numeric'}).format(new Date(article.publishedAt));
  return <main className={styles.page}>
    <section className={`${styles.hero} ${styles.heroDark}`}><div className={styles.heroContent}><Link className={styles.backLink} to={`/blogs/${blogHandle}`}>← Volver al journal</Link><p className={styles.eyebrow}>Essenze Journal</p><h1 className={styles.title}>{article.title}</h1><div className={styles.articleByline}><time dateTime={article.publishedAt}>{date}</time>{article.author?.name?<><span>·</span><address>{article.author.name}</address></>:null}</div></div></section>
    {article.image?<div className={styles.articleHeroImage}><Image data={article.image} sizes="(min-width: 1320px) 1320px, 94vw" loading="eager"/></div>:null}
    <section className={styles.content}><article className={styles.richText} dangerouslySetInnerHTML={{__html:article.contentHtml}}/></section>
  </main>;
}
const ARTICLE_QUERY=`#graphql
 query Article($articleHandle:String!,$blogHandle:String!,$country:CountryCode,$language:LanguageCode) @inContext(language:$language,country:$country){blog(handle:$blogHandle){handle articleByHandle(handle:$articleHandle){handle title contentHtml publishedAt author:authorV2{name} image{id altText url width height} seo{description title}}}}
`;
/** @typedef {import('./+types/blogs.$blogHandle.$articleHandle').Route} Route */
