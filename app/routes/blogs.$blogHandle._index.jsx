import {Link, useLoaderData} from 'react-router';
import {Image, getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import styles from '~/styles/EditorialPage.module.css';

export const meta = ({data}) => [{title: `${data?.blog?.seo?.title || data?.blog?.title || 'Journal'} | Essenze`}, ...(data?.blog?.seo?.description ? [{name:'description',content:data.blog.seo.description}] : [])];
export async function loader(args) { return {...loadDeferredData(args), ...(await loadCriticalData(args))}; }
async function loadCriticalData({context, request, params}) {
  const paginationVariables = getPaginationVariables(request, {pageBy: 8});
  if (!params.blogHandle) throw new Response('Journal no encontrado', {status:404});
  const {blog} = await context.storefront.query(BLOGS_QUERY, {variables:{blogHandle:params.blogHandle,...paginationVariables}});
  if (!blog?.articles) throw new Response('No encontrado', {status:404});
  redirectIfHandleIsLocalized(request,{handle:params.blogHandle,data:blog});
  return {blog};
}
function loadDeferredData(){return {};}

export default function Blog() {
  const {blog}=useLoaderData();
  return (
    <main className={styles.page}>
      <section className={`${styles.hero} ${styles.heroDark}`}><div className={styles.heroContent}><Link className={styles.backLink} to="/blogs">← Journal</Link><p className={styles.eyebrow}>Essenze Editorial</p><h1 className={styles.title}>{blog.title}</h1><p className={styles.lede}>{blog.seo?.description || 'Historias y conocimiento para vivir la perfumería con más intención.'}</p></div></section>
      <section className={styles.content}>
        <PaginatedResourceSection connection={blog.articles} resourcesClassName={styles.articleGrid} ariaLabel={`Artículos de ${blog.title}`}>
          {({node:article,index})=><ArticleItem article={article} key={article.id} loading={index<2?'eager':'lazy'}/>} 
        </PaginatedResourceSection>
      </section>
    </main>
  );
}
function ArticleItem({article,loading}) {
  const date=new Intl.DateTimeFormat('es-MX',{year:'numeric',month:'long',day:'numeric'}).format(new Date(article.publishedAt));
  return <Link className={styles.articleCard} to={`/blogs/${article.blog.handle}/${article.handle}`}>
    <div className={styles.articleImage}>{article.image?<Image alt={article.image.altText||article.title} data={article.image} loading={loading} sizes="(min-width: 768px) 50vw, 100vw"/>:null}</div>
    <div className={styles.articleMeta}><span>{date}</span>{article.author?.name?<span>· {article.author.name}</span>:null}</div><h3>{article.title}</h3>
  </Link>;
}
const BLOGS_QUERY=`#graphql
  query Blog($language: LanguageCode,$blogHandle:String!,$first:Int,$last:Int,$startCursor:String,$endCursor:String) @inContext(language:$language){
    blog(handle:$blogHandle){title handle seo{title description} articles(first:$first,last:$last,before:$startCursor,after:$endCursor){nodes{...ArticleItem} pageInfo{hasPreviousPage hasNextPage endCursor startCursor}}}
  }
  fragment ArticleItem on Article {author:authorV2{name} handle id image{id altText url width height} publishedAt title blog{handle}}
`;
/** @typedef {import('./+types/blogs.$blogHandle._index').Route} Route */
