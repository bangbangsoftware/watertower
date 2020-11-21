import {log, error} from './log.js'

const ws = new WebSocket("ws://localhost:3000/ws");
const CONNECTING = 0;
const OPEN	= 1; 
const CLOSING = 2;	
const CLOSED = 3;


const send = () =>{
    log("Sending storage");
    ws.send(JSON.stringify(window.localStorage));
}

document.addEventListener('storage', function(e) {  
    if (ws.readyState == CONNECTING){
        const waiting = () =>{
            send();
            ws.removeEventListener("open",waiting);
        }
        ws.addEventListener("open",waiting);
        return;
    }
    if (ws.readyState == OPEN){
        send();
        return;
    }
    const state = ws.readyState == CLOSED ? "closed": "closing";
    error("Websocket is "+state);
});

const listenerSetup = (incoming, document) => async ({target}) =>{
    const ws = target;
    log("websocket open");
    ws.addEventListener("message", incoming);
}

const connect = async () =>{
    const listener = listenerSetup(event => console.log(event), document);
    ws.addEventListener("open", listener);
    const event = new Event("storage");
    document.dispatchEvent(event);
}
connect();

