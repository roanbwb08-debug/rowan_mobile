type Turn={role:'user'|'assistant';text:string;products:string[]}
const sessions=new Map<string,Turn[]>()
export function history(id:string){return sessions.get(id)?.slice(-6)??[]}
export function remember(id:string,turn:Turn){const next=[...(sessions.get(id)??[]),turn].slice(-8);sessions.set(id,next)}
