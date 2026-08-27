import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { automaticPatterns, automaticTranslations } from './translationCatalog'

/* eslint-disable react-refresh/only-export-components */

const translations = {
  es: {
    language:'Idioma', spanish:'Español', english:'Inglés', loginSubtitle:'Ingresa a tu cuenta de administrador',
    userOrEmail:'Usuario o correo', password:'Contraseña', signIn:'Ingresar al Sistema', noAccount:'¿No tienes una cuenta?', register:'Regístrate',
    wrongCredentials:'Correo/usuario o contraseña incorrectos', showPassword:'Mostrar contraseña', hidePassword:'Ocultar contraseña',
    sections:{main:'Principal',communication:'Comunicación',clinical:'Clínico',finance:'Finanzas',summary:'Resumen',settings:'Configuración'},
    menu:{agenda:'Agenda',reminders:'Recordatorios',history:'Historia Clínica',odontogram:'Odontograma',periodontogram:'Periodontograma',payments:'Pagos y Caja',inventory:'Inventario',reports:'Reportes',dashboard:'Dashboard',integrations:'Integraciones',team:'Equipo',treatmentPlans:'Planes de tratamiento'},
    lightTheme:'Tema claro', darkTheme:'Tema oscuro', logout:'Cerrar Sesión', clinicManagement:'Gestión clínica odontológica',
    firstName:'Primer nombre', firstSurname:'Primer apellido', optional:'opcional', phone:'Celular', email:'Correo',
  },
  en: {
    language:'Language', spanish:'Spanish', english:'English', loginSubtitle:'Sign in to your administrator account',
    userOrEmail:'Username or email', password:'Password', signIn:'Sign in', noAccount:"Don't have an account?", register:'Register',
    wrongCredentials:'Incorrect email/username or password', showPassword:'Show password', hidePassword:'Hide password',
    sections:{main:'Main',communication:'Communication',clinical:'Clinical',finance:'Finance',summary:'Overview',settings:'Settings'},
    menu:{agenda:'Schedule',reminders:'Reminders',history:'Clinical History',odontogram:'Odontogram',periodontogram:'Periodontogram',payments:'Payments & Cash',inventory:'Inventory',reports:'Reports',dashboard:'Dashboard',integrations:'Integrations',team:'Team',treatmentPlans:'Treatment plans'},
    lightTheme:'Light theme', darkTheme:'Dark theme', logout:'Sign out', clinicManagement:'Dental clinic management',
    firstName:'First name', firstSurname:'First surname', optional:'optional', phone:'Mobile phone', email:'Email',
  },
}

const LanguageContext=createContext(null)

const reverseTranslations=Object.fromEntries(Object.entries(automaticTranslations).map(([es,en])=>[en,es]))
const translatedAttributes=['placeholder','title','aria-label']

function preserveWhitespace(original,translated){
  const leading=original.match(/^\s*/u)?.[0]||''
  const trailing=original.match(/\s*$/u)?.[0]||''
  return `${leading}${translated}${trailing}`
}

function translateValue(value,language){
  if(!value)return value
  const trimmed=value.trim()
  const source=language==='en'?automaticTranslations:reverseTranslations
  if(source[trimmed])return preserveWhitespace(value,source[trimmed])
  if(language==='en'){
    for(const [pattern,replacement] of automaticPatterns){
      if(pattern.test(trimmed))return preserveWhitespace(value,trimmed.replace(pattern,replacement))
    }
  }
  return value
}

function translateTree(root,language){
  if(!root)return
  const translateElement=(element)=>{
    translatedAttributes.forEach(attribute=>{
      if(element.hasAttribute?.(attribute)){
        const current=element.getAttribute(attribute)
        const next=translateValue(current,language)
        if(next!==current)element.setAttribute(attribute,next)
      }
    })
  }
  if(root.nodeType===Node.TEXT_NODE){
    const next=translateValue(root.nodeValue,language)
    if(next!==root.nodeValue)root.nodeValue=next
    return
  }
  if(root.nodeType!==Node.ELEMENT_NODE)return
  translateElement(root)
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT)
  let node=walker.nextNode()
  while(node){
    if(node.nodeType===Node.TEXT_NODE){
      const next=translateValue(node.nodeValue,language)
      if(next!==node.nodeValue)node.nodeValue=next
    }else translateElement(node)
    node=walker.nextNode()
  }
}

export function LanguageProvider({children}){
  const [language,setLanguage]=useState(()=>localStorage.getItem('odontospace-language')||'es')
  useEffect(()=>{localStorage.setItem('odontospace-language',language);document.documentElement.lang=language},[language])
  useEffect(()=>{
    translateTree(document.body,language)
    const observer=new MutationObserver(mutations=>mutations.forEach(mutation=>{
      if(mutation.type==='characterData')translateTree(mutation.target,language)
      mutation.addedNodes.forEach(node=>translateTree(node,language))
      if(mutation.type==='attributes')translateTree(mutation.target,language)
    }))
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:translatedAttributes})
    return ()=>observer.disconnect()
  },[language])
  const value=useMemo(()=>({
    language,
    locale:language==='en'?'en-US':'es-CO',
    setLanguage,
    t:(key,variables={})=>{
      const resolved=key.split('.').reduce((entry,part)=>entry?.[part],translations[language])??key
      return Object.entries(variables).reduce((text,[name,replacement])=>text.replaceAll(`{{${name}}}`,replacement),resolved)
    },
    translate:(text)=>translateValue(text,language).trim(),
  }),[language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage=()=>useContext(LanguageContext)

export function LanguageToggle({compact=false}){
  const {language,setLanguage,t}=useLanguage()
  return <div className={`flex max-w-full rounded-xl border border-white/10 bg-white/[0.03] p-1 ${compact?'flex-col gap-1':'gap-1'}`} aria-label={t('language')}>
    <button type="button" onClick={()=>setLanguage('es')} aria-label={t('spanish')} title={t('spanish')} className={`rounded-lg px-1.5 py-1 text-base leading-none transition ${language==='es'?'bg-primary/20 ring-1 ring-primary/40':'opacity-50 hover:opacity-100'}`}>🇪🇸</button>
    <button type="button" onClick={()=>setLanguage('en')} aria-label={t('english')} title={t('english')} className={`rounded-lg px-1.5 py-1 text-base leading-none transition ${language==='en'?'bg-primary/20 ring-1 ring-primary/40':'opacity-50 hover:opacity-100'}`}>🇬🇧</button>
  </div>
}
