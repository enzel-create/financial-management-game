'use client';
import { createContext, useContext, createElement } from 'react';
export const CompanyAccessContext = createContext<any>(null);
export function ActionControl({ tag = 'button', actionType, disabled, title, ...props }: {tag?:string;actionType:string;disabled?:boolean;title?:string;onChange?:(event:any)=>void;[key:string]:any}) {
 const access = useContext(CompanyAccessContext);
 const allowed = !access || access.permissions?.includes(actionType) || ['guide_step','lobby_ready','approval_decide','approval_cancel'].includes(actionType);
 return createElement(tag, {...props, disabled: disabled || !allowed, title: !allowed ? '由对应职位操作 / Assigned role only' : title});
}
