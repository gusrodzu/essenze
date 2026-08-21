import {useLoaderData} from 'react-router';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import styles from '~/styles/EditorialPage.module.css';

export const meta=({data})=>[{title:`${data?.page?.seo?.title||data?.page?.title||'Essenze'} | Essenze`},...(data?.page?.seo?.description?[{name:'description',content:data.page.seo.description}]:[])];
export async function loader(args){return {...loadDeferredData(args),...(await loadCriticalData(args))};}
async function loadCriticalData({context,request,params}){if(!params.handle)throw new Error('Missing page handle');const {page}=await context.storefront.query(PAGE_QUERY,{variables:{handle:params.handle}});if(!page)throw new Response('No encontrado',{status:404});redirectIfHandleIsLocalized(request,{handle:params.handle,data:page});return {page};}
function loadDeferredData(){return {};}
export default function Page(){const {page}=useLoaderData();return <main className={styles.page}><section className={`${styles.hero} ${styles.heroLight}`}><div className={styles.heroContent}><p className={styles.eyebrow}>Essenze</p><h1 className={styles.title}>{page.title}</h1>{page.seo?.description?<p className={styles.lede}>{page.seo.description}</p>:null}</div></section><section className={styles.content}><div className={styles.richText} dangerouslySetInnerHTML={{__html:page.body}}/></section></main>;}
const PAGE_QUERY=`#graphql query Page($language:LanguageCode,$country:CountryCode,$handle:String!) @inContext(language:$language,country:$country){page(handle:$handle){handle id title body seo{description title}}}`;
/** @typedef {import('./+types/pages.$handle').Route} Route */
