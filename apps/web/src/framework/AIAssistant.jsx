import {useEffect,useState} from 'react';
import {ArrowUp,Bot,Database,Sparkles,X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {apiRequest} from '../api';
import {getAIContext} from './aiContext';
import styles from './AIAssistant.module.css';

export default function AIAssistant({open,onClose,initialPrompt=''}) {
  const location=useLocation();
  const context=getAIContext(location.pathname);
  const [value,setValue]=useState('');
  const [messages,setMessages]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(open&&initialPrompt)setValue(initialPrompt);
  },[open,initialPrompt]);

  if(!open)return null;

  async function submit(event){
    event?.preventDefault?.();
    const question=value.trim();
    if(!question||loading)return;
    setValue('');
    setError('');
    setMessages(current=>[...current,{role:'user',text:question}]);
    setLoading(true);
    try{
      const result=await apiRequest('/ai/ask',{
        method:'POST',
        body:{question,route:location.pathname,context:context.key}
      });
      setMessages(current=>[...current,{
        role:'assistant',
        text:result.answer,
        provider:result.provider,
        sources:result.sources||[]
      }]);
    }catch(err){
      setError(err.message);
    }finally{
      setLoading(false);
    }
  }

  return <aside className={styles.panel}>
    <header>
      <div className={styles.bot}><Bot size={20}/></div>
      <div><strong>BuzzBee AI</strong><small>Contexto: {context.label} · Solo lectura</small></div>
      <button onClick={onClose} aria-label="Cerrar asistente"><X size={19}/></button>
    </header>

    <div className={styles.body}>
      {messages.length===0&&<>
        <div className={styles.hero}>
          <Sparkles size={24}/>
          <h2>Pregunta sobre {context.label}</h2>
          <p>BuzzBee consulta únicamente información del ERP a la que tu usuario tiene acceso.</p>
        </div>
        <div className={styles.suggestions}>
          {context.suggestions.slice(0,4).map(question=>
            <button key={question} onClick={()=>setValue(question)}>{question}</button>
          )}
        </div>
      </>}

      {messages.length>0&&<div className={styles.conversation}>
        {messages.map((message,index)=>
          <div key={`${message.role}-${index}`} className={message.role==='user'?styles.userMessage:styles.aiMessage}>
            <strong>{message.role==='user'?'Tú':'🐝 BuzzBee AI'}</strong>
            <p>{message.text}</p>
            {message.role==='assistant'&&message.sources?.length>0&&
              <small><Database size={12}/> Basado en: {message.sources.map(x=>x.name).join(', ')}</small>}
          </div>
        )}
        {loading&&<div className={styles.aiMessage}><strong>🐝 BuzzBee AI</strong><p>Analizando datos del módulo…</p></div>}
      </div>}
      {error&&<div className={styles.error}>{error}</div>}
    </div>

    <form onSubmit={submit}>
      <textarea rows="3" value={value} onChange={event=>setValue(event.target.value)}
        placeholder={`Pregunta sobre ${context.label.toLowerCase()}...`}/>
      <button type="submit" aria-label="Enviar" disabled={loading}><ArrowUp size={18}/></button>
    </form>
  </aside>;
}
