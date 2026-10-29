// Coalesce local writes, pause during forms/offline, and retry transient failures.
export function createAutoSync({sync,canRun,setTimer=setTimeout,clearTimer=clearTimeout,setRepeat=setInterval,clearRepeat=clearInterval}){
 let timer=null,running=false,disposed=false;
 const request=(delay=1500)=>{if(disposed||running)return;clearTimer(timer);timer=setTimer(run,delay)};
 async function run(){timer=null;if(disposed||running||!canRun())return;running=true;let ok=false;try{ok=await sync()}catch{}finally{running=false;if(!disposed&&!ok)request(15000)}}
 const interval=setRepeat(()=>request(0),60000);
 return {request,dispose(){disposed=true;clearTimer(timer);clearRepeat(interval)}};
}
